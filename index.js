/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import App from './src/main';
import { Init } from './src/profile';
import React  from "react";
import { GlobalContext } from './src/global-context';


Init();

const AppWithCtx = (props) => (
    <GlobalContext.Provider value={{
        url: props.url
    }}>
        <App />
    </GlobalContext.Provider>
)


AppRegistry.registerComponent(appName, () => AppWithCtx);
