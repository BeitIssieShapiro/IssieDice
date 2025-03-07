/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import App from './src/main';
import { Init } from './src/profile';
import React from "react";
import { GlobalContext } from './src/global-context';
import { EditText } from './src/edit-text';
import { EditDice } from './src/edit-dice';

import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

Init();

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
