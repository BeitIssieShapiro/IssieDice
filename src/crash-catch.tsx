import Clipboard from '@react-native-clipboard/clipboard';
import { Alert } from 'react-native';
import { setJSExceptionHandler, setNativeExceptionHandler } from 'react-native-exception-handler';

const errorHandler = (error: Error, isFatal: boolean): void => {
    const err = `Error: ${isFatal?"Fatal":""} ${error.name} ${error.message}
    Stack Trace: 
    ${error.stack}`;
    nativeErrorHandler(err);
};

const nativeErrorHandler = (exceptionMsg: string): void => {
    Alert.alert("Unexpected error occured", exceptionMsg, [{ text: "OK" }, {text:"Copy", onPress:()=>{
        Clipboard.setString(exceptionMsg);
    }}])
}

export function InitCrashCatch() {
    setJSExceptionHandler(errorHandler, true);
    setNativeExceptionHandler(nativeErrorHandler, false, false);
}
