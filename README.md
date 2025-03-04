 cameraDidMount: (camera) => {
                if (camera.props.active) {
                    //console.log("XX",
                    let t = (0, react_native_1.findNodeHandle)(this);
                    let c = (0, react_native_1.findNodeHandle)(camera);
                    setTimeout(()=>
                    react_native_1.NativeModules.VRTCameraModule.setSceneCamera(t,c),100);
                }
            },


Mockups:

https://xd.adobe.com/view/43e02c8a-ebee-4495-aff9-042b85e213b6-16b3
https://xd.adobe.com/view/2787b739-50b8-4610-b19a-fcadc5c5f1ff-72d4/

//text input crash
https://github.com/facebook/react-native/pull/49320/files


fonts:
add in assets/fonts
`npx react-native-asset`

https://github.com/software-mansion/react-native-screens/issues/2652    