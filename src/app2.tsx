import React from 'react';
import { TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function App2() {
    return <SafeAreaView>
        <View>
            <TextInput
                style={[
                    {
                        fontSize: 20,
                        padding: 10,
                        borderWidth: 1,
                        borderRadius: 5,
                        marginBottom: 15,
                        textAlign: "center",
                    },
                    { width: "30%", marginTop: 10 },

                ]}
                placeholderTextColor="gray"
                multiline={true}
                autoCapitalize="none"
                autoCorrect={false}

                onChangeText={(newText) => {
                    //setText(newText);
                }}
                autoFocus
                allowFontScaling={false}

            />
        </View>
    </SafeAreaView>
}


