/**
 * @format
 */

import {AppRegistry} from 'react-native';
import {name as appName} from './app.json';
import App from './src/main';
import { Init } from './src/profile';
Init();

AppRegistry.registerComponent(appName, () => App);
