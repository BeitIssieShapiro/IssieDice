import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform, Text, TouchableOpacity } from 'react-native';
import { Camera, CameraApi, CameraType } from 'react-native-camera-kit';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { translate } from './lang';
import { IconButton } from './components';
import { Touchable } from 'react-native';

interface CameraOverlayProps {
  onClose: () => void;
  onDone: (uri: string) => void;
}

export const CameraOverlay: React.FC<CameraOverlayProps> = ({ onClose, onDone }) => {
  const [captureInProgress, setCaptureInProgress] = useState<boolean>(false);
  const [permission, setPermission] = useState<boolean>(false);

  // Request camera permissions on mount.
  useEffect(() => {
    const permissionType = Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;
    request(permissionType)
      .then((result) => {
        if (result === RESULTS.GRANTED || result === RESULTS.LIMITED) {
          setPermission(true);
        }
      })
      .catch((e) => console.log("no cam perm", e));
  }, []);

  const cameraRef = useRef<CameraApi>(null);

  const takePicture = async () => {
    if (captureInProgress) return;
    try {
      setCaptureInProgress(true);
      let image: { uri: string } | undefined;
      if (cameraRef.current) {
        image = await cameraRef.current.capture();
      }

      if (image?.uri) {
        onDone(image.uri);
      }
    } catch (error) {
      console.log("Error taking picture:", error);
    } finally {
      setCaptureInProgress(false);
    }
  };

  const cancel = () => {
    onClose();
  };

  return (
    <View style={styles.container}>
      {permission ? (
        <Camera
          ref={cameraRef}
          style={styles.camera}
          cameraType={CameraType.Front}
          shutterPhotoSound={true}
        //saveToCameraRoll={false}
        />
      ) : (
        <Text style={styles.permissionText}>
          {translate("MissingCameraPermission")}
        </Text>
      )}

      <View style={styles.topContainer}>
        <IconButton icon="close" text={translate("DoneBtn")} onPress={onClose} backgroundColor='white'/>
      </View>
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.shutterOuter} onPress={takePicture}>
          <View style={styles.shutterInner} />
        </TouchableOpacity>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "absolute",
    top: 0, left: 0,
    width: "100%", height: "100%",
    backgroundColor: "lightgray",
    zIndex: 1100
  },
  camera: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  permissionText: {
    textAlign: 'center',
    position: 'absolute',
    width: '100%',
    top: 100,
  },
  topContainer: {
    position: 'absolute',
    alignItems: 'center',
    top: '2%',
    width: '100%',
    backgroundColor: 'transparent',
  },
  bottomContainer: {
    position: 'absolute',
    alignItems: 'center',
    bottom: '2%',
    width: '100%',
    backgroundColor: 'transparent',
  },
  shutterOuter: {
    width: 100, height: 100,
    borderRadius: 50,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 80, height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "black",
  }
});