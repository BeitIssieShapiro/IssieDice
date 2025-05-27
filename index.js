import { AppRegistry, Image, View } from 'react-native';
import { GlobalContext } from './src/global-context';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { InitCrashCatch } from './src/crash-catch';
import { name as appName } from './app.json';
import App from './src/main';
import { Init } from './src/settings-storage';
import { useEffect, useState } from 'react';
import SplashScreen from 'react-native-splash-screen';
import { initAssets } from './src/assets';

Init();

InitCrashCatch();

export const audioRecorderPlayer = new AudioRecorderPlayer();

const AppWithCtx = (props) => {
    const [assetsReady, setAssetsReady] = useState(false);
    useEffect(()=>{
        initAssets().then(()=>{
            console.log("init asset success");
            setAssetsReady(true);
        }).catch(e=>console.log("init asset failed",e))
    },[])
    useEffect(() => {
        const now = Date.now();
        const nativeStartTime = props.nativeStartTime ?? now;
        const elapsed = now - nativeStartTime;
        const minDuration = 2000;
        const remaining = Math.max(0, minDuration - elapsed);

        console.log("Splash delay remaining:", remaining);

        setTimeout(() => {
            console.log("Splash Closed");
            SplashScreen.hide();
        }, remaining);
    }, []);

    return <GlobalContext.Provider value={{
        url: props.url
    }}>
        <SafeAreaProvider>
            {assetsReady && <App />}
            {/*<App />
            {/* <View
                style={{
                    position: "absolute",
                    zIndex: 1000,
                    borderWidth: 2,
                    borderColor: "red",
                    borderStyle: "solid",
                    width: 300, height: 300,
                }}
            >
                <Image source={{ uri: "content://com.issiedice.provider/custom-dice/android 1/face_2$$442991.jpg" }}
                    style={{ position: "absolute", width: "100%", height: "100%", backgroundColor:"red" }} />
            </View> */}

        </SafeAreaProvider>
        {/* <EditText label={"my label"} initialText={"abc"} onClose={() => {}}
            onDone={(text, style) => {}} width={400}/> */}
        {/* <EditDice
            name={"cube1"}
            width={900}
            onClose={() => { }} /> */}
    </GlobalContext.Provider>
}


AppRegistry.registerComponent(appName, () => AppWithCtx);
