import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { Colors } from '../constants/colors';

type OcrStatus = 'idle' | 'loading_image' | 'processing' | 'done' | 'error';

// Tesseract.js webview HTML — loads Tesseract.js from CDN and runs OCR
// entirely on the device. No image data is sent to any external server.
const TESSERACT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <style>
    body{margin:0;padding:20px;background:#0F0F13;color:#F1F5F9;font-family:-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;box-sizing:border-box;}
    #status{font-size:15px;text-align:center;opacity:0.7;}
  </style>
</head>
<body>
  <p id="status">Loading OCR engine\u2026</p>
  <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"
    onerror="post({type:'ERROR',message:'Failed to load OCR engine. Please check your internet connection.'})">
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
      if(data && data.type === 'PROCESS_IMAGE'){ processImage(data.base64, data.mimeType, data.lang); }
    }

    async function processImage(base64, mimeType, lang){
      try{
        if(typeof Tesseract === 'undefined'){
          post({type:'ERROR', message:'OCR engine not available.'});
          return;
        }

        setStatus('Initializing OCR engine\u2026');
        var dataUrl = 'data:' + (mimeType || 'image/jpeg') + ';base64,' + base64;

        var worker = await Tesseract.createWorker(lang || 'eng', 1, {
          logger: function(m){
            if(m.status === 'recognizing text' && m.progress){
              var pct = Math.round(m.progress * 100);
              post({type:'PROGRESS', progress: m.progress});
              setStatus('Recognizing text\u2026 ' + pct + '%');
            }
          }
        });

        setStatus('Analyzing image\u2026');
        var result = await worker.recognize(dataUrl);
        await worker.terminate();

        post({type:'RESULT', text: result.data.text, confidence: result.data.confidence});
        setStatus('Done.');
      } catch(err){
        post({type:'ERROR', message: String(err && err.message ? err.message : err)});
      }
    }

    window.onload = function(){
      if(typeof Tesseract !== 'undefined'){
        setStatus('Ready. Waiting for image\u2026');
        post({type:'READY'});
      }
    };
  </script>
</body>
</html>`;

const LANGUAGES = [
  { code: 'eng', label: 'English' },
  { code: 'rus', label: 'Russian' },
  { code: 'eng+rus', label: 'English + Russian' },
  { code: 'deu', label: 'German' },
  { code: 'fra', label: 'French' },
  { code: 'spa', label: 'Spanish' },
];

export default function OcrScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState('image/jpeg');
  const [selectedLang, setSelectedLang] = useState('eng');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [webViewReady, setWebViewReady] = useState(false);
  const [pendingProcess, setPendingProcess] = useState<{
    base64: string;
    mimeType: string;
    lang: string;
  } | null>(null);

  const webViewRef = useRef<WebView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Send pending image to WebView once it's ready
  useEffect(() => {
    if (webViewReady && pendingProcess && webViewRef.current) {
      const { base64, mimeType, lang } = pendingProcess;
      const escaped = base64.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
      webViewRef.current.injectJavaScript(
        `(function(){
           var msg = JSON.stringify({type:'PROCESS_IMAGE', base64:\`${escaped}\`, mimeType:'${mimeType}', lang:'${lang}'});
           window.dispatchEvent(new MessageEvent('message', {data: msg}));
           document.dispatchEvent(new MessageEvent('message', {data: msg}));
         })(); true;`
      );
      setPendingProcess(null);
    }
  }, [webViewReady, pendingProcess]);

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setImageMime(asset.mimeType ?? 'image/jpeg');
      resetOcr();
    }
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to capture an image.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setImageMime(asset.mimeType ?? 'image/jpeg');
      resetOcr();
    }
  };

  const resetOcr = () => {
    setExtractedText('');
    setConfidence(null);
    setProgress(0);
    setOcrStatus('idle');
  };

  const handleExtractText = async () => {
    if (!imageUri) {
      Alert.alert('No Image', 'Please select an image first.');
      return;
    }
    setOcrStatus('loading_image');
    setExtractedText('');
    setConfidence(null);
    setProgress(0);

    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setOcrStatus('processing');
      setWebViewReady(false); // Force re-check; will be set by READY message
      setPendingProcess({ base64, mimeType: imageMime, lang: selectedLang });
    } catch {
      Alert.alert('Error', 'Could not read the selected image.');
      setOcrStatus('error');
    }
  };

  const handleWebViewMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case 'READY': {
          setWebViewReady(true);
          break;
        }
        case 'PROGRESS': {
          setProgress(msg.progress as number);
          break;
        }
        case 'RESULT': {
          setExtractedText((msg.text as string).trim());
          setConfidence(typeof msg.confidence === 'number' ? msg.confidence : null);
          setOcrStatus('done');
          break;
        }
        case 'ERROR': {
          Alert.alert('OCR Error', (msg.message as string) || 'Failed to extract text.');
          setOcrStatus('error');
          break;
        }
        default:
          break;
      }
    },
    []
  );

  const handleShare = async () => {
    if (!extractedText) return;
    try {
      await Share.share({ message: extractedText });
    } catch {
      // user cancelled
    }
  };

  const langLabel = LANGUAGES.find((l) => l.code === selectedLang)?.label ?? selectedLang;
  const isProcessing = ocrStatus === 'loading_image' || ocrStatus === 'processing';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Hidden WebView for Tesseract.js OCR */}
      <View style={styles.hiddenWebView}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: TESSERACT_HTML }}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          onMessage={handleWebViewMessage}
          onError={() => {
            Alert.alert('Error', 'OCR engine failed to load.');
            setOcrStatus('error');
          }}
        />
      </View>

      <Animated.View
        style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Image source buttons */}
          <View style={styles.sourceRow}>
            <TouchableOpacity
              style={[styles.sourceButton, { flex: 1 }]}
              onPress={pickFromGallery}
              disabled={isProcessing}
            >
              <View style={[styles.sourceIconWrapper, { backgroundColor: Colors.primary + '1A' }]}>
                <Ionicons name="images" size={22} color={Colors.primary} />
              </View>
              <Text style={styles.sourceLabel}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sourceButton, { flex: 1 }]}
              onPress={pickFromCamera}
              disabled={isProcessing}
            >
              <View style={[styles.sourceIconWrapper, { backgroundColor: Colors.secondary + '1A' }]}>
                <Ionicons name="camera" size={22} color={Colors.secondary} />
              </View>
              <Text style={styles.sourceLabel}>Camera</Text>
            </TouchableOpacity>
          </View>

          {/* Selected image preview */}
          {imageUri && (
            <View style={styles.imagePreviewCard}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
            </View>
          )}

          {/* Language selector */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Recognition Language</Text>
            <TouchableOpacity
              style={styles.langSelector}
              onPress={() => setShowLangPicker((v) => !v)}
              disabled={isProcessing}
            >
              <Ionicons name="language" size={18} color={Colors.primary} />
              <Text style={styles.langSelectorText}>{langLabel}</Text>
              <Ionicons
                name={showLangPicker ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
            {showLangPicker && (
              <View style={styles.langList}>
                {LANGUAGES.map((l) => (
                  <TouchableOpacity
                    key={l.code}
                    style={[
                      styles.langOption,
                      selectedLang === l.code && {
                        backgroundColor: Colors.primary + '1A',
                        borderColor: Colors.primary,
                      },
                    ]}
                    onPress={() => {
                      setSelectedLang(l.code);
                      setShowLangPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.langOptionText,
                        selectedLang === l.code && { color: Colors.primary },
                      ]}
                    >
                      {l.label}
                    </Text>
                    {selectedLang === l.code && (
                      <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Extract button */}
          <TouchableOpacity
            style={[
              styles.extractButton,
              (!imageUri || isProcessing) && styles.buttonDisabled,
            ]}
            onPress={handleExtractText}
            disabled={!imageUri || isProcessing}
          >
            {isProcessing ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.extractButtonText}>
                  {ocrStatus === 'loading_image'
                    ? 'Loading image…'
                    : `Processing… ${Math.round(progress * 100)}%`}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="text" size={20} color="#fff" />
                <Text style={styles.extractButtonText}>Extract Text</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Results */}
          {ocrStatus === 'done' && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.cardLabel}>Extracted Text</Text>
                <View style={styles.resultActions}>
                  {confidence !== null && (
                    <View style={styles.confidenceBadge}>
                      <Text style={styles.confidenceText}>
                        {Math.round(confidence)}% confidence
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
                    <Ionicons name="share-outline" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              <TextInput
                style={styles.resultText}
                value={extractedText || '(No text detected)'}
                multiline
                editable
                selectTextOnFocus
                selectionColor={Colors.primary}
              />
            </View>
          )}

          {/* Empty / info state */}
          {ocrStatus === 'idle' && !imageUri && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrapper}>
                <Ionicons name="text-outline" size={40} color={Colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Offline Text Recognition</Text>
              <Text style={styles.emptySubtext}>
                Select or capture an image to extract text from scanned documents, receipts,
                signs, and more.
              </Text>
              <View style={styles.infoCard}>
                <Ionicons name="shield-checkmark-outline" size={16} color={Colors.success} />
                <Text style={styles.infoText}>
                  OCR runs entirely on your device. No images or text are sent to any server.
                  Requires internet on first use to download the engine.
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
    backgroundColor: Colors.background,
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
    gap: 16,
  },
  sourceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sourceButton: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  sourceIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  imagePreviewCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    maxHeight: 240,
  },
  imagePreview: {
    width: '100%',
    height: 240,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  langSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langSelectorText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  langList: {
    marginTop: 10,
    gap: 6,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langOptionText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  extractButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  extractButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confidenceBadge: {
    backgroundColor: Colors.success + '1A',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  confidenceText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  iconButton: {
    padding: 4,
  },
  resultText: {
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 24,
    gap: 12,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },
});
