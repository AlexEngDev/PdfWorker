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
          webStyle={`
            .m-signature-pad { box-shadow: none; border: 1px solid ${Colors.border}; border-radius: 12px; }
            .m-signature-pad--body { border: none; }
            .m-signature-pad--footer { background: ${Colors.background}; padding: 8px; }
            .button.clear { background: transparent; border: 1.5px solid ${Colors.danger}; color: ${Colors.danger}; border-radius: 8px; }
            .button.save { background: ${Colors.primary}; color: #fff; border-radius: 8px; }
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
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  canvas: {
    height: 200,
  },
});
