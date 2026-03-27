import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useTheme } from '../contexts/ThemeContext';
import { requestMediaLibraryPermission } from '../utils/permissions';

type ExtractedPage = {
  pageNum: number;
  dataUrl: string;
  fileUri?: string;
};

type ProcessingStatus = 'idle' | 'loading_pdf' | 'extracting' | 'done' | 'error';

// PDF.js webview HTML — loads PDF.js from CDN, renders each page to canvas,
// and posts the JPEG data URL back to React Native.
const PDFJS_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <style>
    body{margin:0;padding:20px;background:#0F0F13;color:#F1F5F9;font-family:-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;box-sizing:border-box;}
    #status{font-size:15px;text-align:center;opacity:0.7;}
  </style>
</head>
<body>
  <p id="status">Loading PDF engine\u2026</p>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
    onerror="post({type:'ERROR',message:'Failed to load PDF engine. Please check your internet connection.'})">
  </script>
  <script>
    function post(obj){ window.ReactNativeWebView.postMessage(JSON.stringify(obj)); }

    function setStatus(msg){ document.getElementById('status').textContent = msg; }

    window.addEventListener('message', function(e){
      try{ handleMsg(JSON.parse(e.data)); }catch(_){}
    });
    document.addEventListener('message', function(e){
      try{ handleMsg(JSON.parse(e.data)); }catch(_){}
    });

    function handleMsg(data){
      if(data && data.type === 'PROCESS_PDF'){ processPdf(data.base64, data.scale||1.5); }
    }

    async function processPdf(base64, scale){
      try{
        if(typeof pdfjsLib === 'undefined'){
          post({type:'ERROR', message:'PDF engine not available.'});
          return;
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        setStatus('Decoding PDF\u2026');
        var binary = atob(base64);
        var bytes = new Uint8Array(binary.length);
        for(var i=0;i<binary.length;i++){ bytes[i]=binary.charCodeAt(i); }

        var pdf = await pdfjsLib.getDocument({data: bytes}).promise;
        var numPages = pdf.numPages;
        post({type:'TOTAL', numPages: numPages});
        setStatus('Extracting '+numPages+' page(s)\u2026');

        for(var p=1; p<=numPages; p++){
          var page = await pdf.getPage(p);
          var vp = page.getViewport({scale: scale});
          var canvas = document.createElement('canvas');
          canvas.width = vp.width;
          canvas.height = vp.height;
          var ctx = canvas.getContext('2d');
          await page.render({canvasContext:ctx, viewport:vp}).promise;
          var dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          post({type:'PAGE', pageNum:p, numPages:numPages, dataUrl:dataUrl});
          setStatus('Extracted page '+p+' of '+numPages);
        }

        post({type:'DONE'});
        setStatus('Done.');
      } catch(err){
        post({type:'ERROR', message: String(err && err.message ? err.message : err)});
      }
    }

    // Signal that the HTML is ready
    window.onload = function(){
      if(typeof pdfjsLib !== 'undefined'){
        setStatus('Ready. Waiting for PDF\u2026');
        post({type:'READY'});
      }
    };
  </script>
</body>
</html>`;

export default function PdfToImageScreen() {
  const { colors } = useTheme();
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState('');
  const [pages, setPages] = useState<ExtractedPage[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [webViewReady, setWebViewReady] = useState(false);
  const [pendingBase64, setPendingBase64] = useState<string | null>(null);

  const webViewRef = useRef<WebView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Once the WebView is ready AND we have a pending base64, trigger processing
  useEffect(() => {
    if (webViewReady && pendingBase64 && webViewRef.current) {
      const escaped = pendingBase64.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
      webViewRef.current.injectJavaScript(
        `(function(){
           var msg = JSON.stringify({type:'PROCESS_PDF', base64:\`${escaped}\`, scale:1.5});
           window.dispatchEvent(new MessageEvent('message', {data: msg}));
           document.dispatchEvent(new MessageEvent('message', {data: msg}));
         })(); true;`
      );
      setPendingBase64(null);
    }
  }, [webViewReady, pendingBase64]);

  const selectPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled || result.assets.length === 0) return;

      const asset = result.assets[0];
      setPdfUri(asset.uri);
      setPdfName(asset.name);
      setPages([]);
      setTotal(0);
      setStatus('loading_pdf');
      setWebViewReady(false);

      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setPendingBase64(base64);
    } catch {
      Alert.alert('Error', 'Could not load the selected PDF.');
      setStatus('error');
    }
  };

  const handleWebViewMessage = useCallback(
    async (event: { nativeEvent: { data: string } }) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case 'READY': {
          setWebViewReady(true);
          if (status === 'loading_pdf') setStatus('extracting');
          break;
        }
        case 'TOTAL': {
          setTotal(msg.numPages as number);
          setStatus('extracting');
          break;
        }
        case 'PAGE': {
          const dataUrl = msg.dataUrl as string;
          const pageNum = msg.pageNum as number;
          // Save the image to a temp file so we can display it reliably
          const tempPath = `${FileSystem.cacheDirectory}pdf_page_${pageNum}_${Date.now()}.jpg`;
          const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
          await FileSystem.writeAsStringAsync(tempPath, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          setPages((prev) => [
            ...prev,
            { pageNum, dataUrl: `file://${tempPath}`, fileUri: tempPath },
          ]);
          break;
        }
        case 'DONE': {
          setStatus('done');
          break;
        }
        case 'ERROR': {
          Alert.alert('Error', (msg.message as string) || 'Failed to extract pages.');
          setStatus('error');
          break;
        }
        default:
          break;
      }
    },
    [status]
  );

  const savePageToGallery = async (page: ExtractedPage) => {
    const granted = await requestMediaLibraryPermission();
    if (!granted) {
      Alert.alert('Permission Required', 'Please grant access to the media library in Settings.');
      return;
    }
    try {
      const asset = await MediaLibrary.createAssetAsync(page.fileUri ?? page.dataUrl);
      await MediaLibrary.createAlbumAsync('PDF Worker', asset, false);
      Alert.alert('Saved', `Page ${page.pageNum} saved to gallery.`);
    } catch {
      Alert.alert('Error', 'Could not save the image to gallery.');
    }
  };

  const saveAllToGallery = async () => {
    if (pages.length === 0) return;
    const granted = await requestMediaLibraryPermission();
    if (!granted) {
      Alert.alert('Permission Required', 'Please grant access to the media library in Settings.');
      return;
    }
    try {
      let album: MediaLibrary.Album | null = null;
      for (const page of pages) {
        const asset = await MediaLibrary.createAssetAsync(page.fileUri ?? page.dataUrl);
        if (!album) {
          album = await MediaLibrary.createAlbumAsync('PDF Worker', asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }
      }
      Alert.alert('Saved', `${pages.length} page(s) saved to gallery in "PDF Worker" album.`);
    } catch {
      Alert.alert('Error', 'Could not save images to gallery.');
    }
  };

  const sharePage = async (page: ExtractedPage) => {
    try {
      await Share.share({ url: page.fileUri ?? '' });
    } catch {
      // user cancelled
    }
  };

  const isProcessing = status === 'loading_pdf' || status === 'extracting';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Hidden WebView for PDF.js processing */}
      <View style={styles.hiddenWebView}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: PDFJS_HTML }}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          onMessage={handleWebViewMessage}
          onError={() => {
            Alert.alert('Error', 'WebView failed to load.');
            setStatus('error');
          }}
        />
      </View>

      <Animated.View
        style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Select PDF */}
          <TouchableOpacity
            style={[styles.selectButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={selectPdf}
            disabled={isProcessing}
          >
            <View style={[styles.selectIconWrapper, { backgroundColor: colors.accent + '1A' }]}>
              <Ionicons name="document-attach" size={22} color={colors.accent} />
            </View>
            <View style={styles.selectTextWrapper}>
              <Text style={[styles.selectTitle, { color: colors.textPrimary }]}>
                {pdfUri ? pdfName : 'Select PDF'}
              </Text>
              <Text style={[styles.selectSubtext, { color: colors.textMuted }]}>
                {pdfUri ? 'Tap to choose another file' : 'Choose a PDF to extract pages'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Processing indicator */}
          {isProcessing && (
            <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <View style={styles.progressInfo}>
                <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>
                  {status === 'loading_pdf' ? 'Loading PDF…' : 'Extracting pages…'}
                </Text>
                {total > 0 && (
                  <Text style={[styles.progressSubtext, { color: colors.textMuted }]}>
                    {pages.length} of {total} pages done
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Extracted pages grid */}
          {pages.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  {pages.length} Page{pages.length !== 1 ? 's' : ''} Extracted
                </Text>
                {status === 'done' && (
                  <TouchableOpacity
                    style={[styles.saveAllButton, { backgroundColor: colors.primary + '1A' }]}
                    onPress={saveAllToGallery}
                  >
                    <Ionicons name="download" size={16} color={colors.primary} />
                    <Text style={[styles.saveAllText, { color: colors.primary }]}>Save All</Text>
                  </TouchableOpacity>
                )}
              </View>

              <FlatList
                data={pages}
                keyExtractor={(item) => String(item.pageNum)}
                numColumns={2}
                scrollEnabled={false}
                columnWrapperStyle={styles.columnWrapper}
                contentContainerStyle={styles.grid}
                renderItem={({ item }) => (
                  <View style={[styles.pageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Image source={{ uri: item.dataUrl }} style={styles.pageThumb} />
                    <View style={[styles.pageOverlay, { backgroundColor: colors.background + 'BF' }]}>
                      <Text style={[styles.pageLabel, { color: colors.textPrimary }]}>
                        Page {item.pageNum}
                      </Text>
                      <View style={styles.pageActions}>
                        <TouchableOpacity
                          style={styles.pageActionButton}
                          onPress={() => savePageToGallery(item)}
                        >
                          <Ionicons name="download-outline" size={18} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.pageActionButton}
                          onPress={() => sharePage(item)}
                        >
                          <Ionicons name="share-outline" size={18} color={colors.textPrimary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              />
            </View>
          )}

          {/* Empty state */}
          {status === 'idle' && (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="images-outline" size={40} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Extract Pages as Images
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Select a PDF above to extract each page as a JPEG image you can save to your
                gallery.
              </Text>
              <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="wifi-outline" size={16} color={colors.textMuted} />
                <Text style={[styles.infoText, { color: colors.textMuted }]}>
                  Requires internet on first use to load the PDF engine. Processing happens
                  entirely on your device — no files are uploaded.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hiddenWebView: {
    width: 0,
    height: 0,
    position: 'absolute',
  },
  content: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    paddingBottom: 100,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  selectIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectTextWrapper: {
    flex: 1,
  },
  selectTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  selectSubtext: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginTop: 16,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  progressSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  grid: {
    gap: 12,
  },
  columnWrapper: {
    gap: 12,
  },
  pageCard: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    aspectRatio: 0.75,
  },
  pageThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  pageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  pageActions: {
    flexDirection: 'row',
    gap: 6,
  },
  pageActionButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 12,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginTop: 8,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
