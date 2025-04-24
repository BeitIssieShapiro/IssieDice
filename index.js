import {AppRegistry} from 'react-native';
import { GlobalContext } from './src/global-context';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { InitCrashCatch } from './src/crash-catch';
import {name as appName} from './app.json';
import App from './src/main';
import { Init } from './src/settings-storage';

Init();

InitCrashCatch();

export const audioRecorderPlayer = new AudioRecorderPlayer();

const AppWithCtx = (props) => (
    <GlobalContext.Provider value={{
        url: props.url
    }}>
        <SafeAreaProvider>
            <App />
        </SafeAreaProvider>
        {/* <EditText label={"my label"} initialText={"abc"} onClose={() => {}}
            onDone={(text, style) => {}} width={400}/> */}
        {/* <EditDice
            name={"cube1"}
            width={900}
            onClose={() => { }} /> */}
    </GlobalContext.Provider>
)


AppRegistry.registerComponent(appName, () => AppWithCtx);
