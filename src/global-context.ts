import React from "react";
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

export const GlobalContext = React.createContext<{url:string} | null>(null);

//export const audioRecorderPlayer = new AudioRecorderPlayer();
