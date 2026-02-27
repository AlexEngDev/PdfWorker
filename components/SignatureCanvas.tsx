import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import { Colors } from '../constants/colors';

type Props = {
  onSignature: (data: string) => void;
};

export type SignatureCanvasRef = {
  clearSignature: () => void;
};

const SignatureCanvasComponent = forwardRef<SignatureCanvasRef, Props>(
  ({ onSignature }, ref) => {
    const canvasRef = useRef<SignatureCanvas>(null);

    useImperativeHandle(ref, () => ({
      clearSignature: () => {
        canvasRef.current?.clearSignature();
      },
    }));

    return (
      <View style={styles.container}>
        <SignatureCanvas
          ref={canvasRef}
          onOK={onSignature}
          onEmpty={() => {}}
          descriptionText=""
          clearText="Clear"
          confirmText="Save"
          backgroundColor="#FFFFFF"
          penColor="#1E293B"
          webStyle={`
            .m-signature-pad { box-shadow: none; border: none; border-radius: 16px; }
            .m-signature-pad--body { border: none; background: #FFFFFF; border-radius: 16px; }
            .m-signature-pad--footer { background: ${Colors.surfaceHigh}; padding: 10px 12px; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px; }
            .button.clear { background: transparent; border: 1.5px solid ${Colors.danger}; color: ${Colors.danger}; border-radius: 12px; font-weight: 600; }
            .button.save { background: ${Colors.primary}; color: #fff; border-radius: 12px; font-weight: 600; }
          `}
          style={styles.canvas}
        />
      </View>
    );
  }
);

SignatureCanvasComponent.displayName = 'SignatureCanvasComponent';

export default SignatureCanvasComponent;

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: '#FFFFFF',
  },
  canvas: {
    height: 220,
  },
});
