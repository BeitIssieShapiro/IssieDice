 cameraDidMount: (camera) => {
                if (camera.props.active) {
                    //console.log("XX",
                    let t = (0, react_native_1.findNodeHandle)(this);
                    let c = (0, react_native_1.findNodeHandle)(camera);
                    setTimeout(()=>
                    react_native_1.NativeModules.VRTCameraModule.setSceneCamera(t,c),100);
                }
            },