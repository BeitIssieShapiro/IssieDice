import React, { useState, useEffect, useRef } from 'react';
import { Pressable, View, Text, StyleSheet, ViewStyle } from 'react-native';
import IconAntDesign from 'react-native-vector-icons/AntDesign';
import { fTranslate } from './lang';

interface CountdownEditButtonProps {
    onComplete: () => void;
    iconSize?: number;
    style:ViewStyle
}

export const CountdownEditButton: React.FC<CountdownEditButtonProps> = ({
    onComplete,
    style,
    iconSize = 30,
}) => {
    // countdown: null means no countdown active.
    const [countdown, setCountdown] = useState<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // When press starts, begin a countdown from 3.
    const handlePressIn = () => {
        setCountdown(__DEV__ ? 0 : 3);
    };

    // When press is released, cancel the countdown.
    const handlePressOut = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setCountdown(null);
    };

    // Use an effect to count down every second.
    useEffect(() => {
        if (countdown === null) return;
        if (countdown === 0) {
            // Countdown finished: trigger onComplete and reset.
            onComplete();
            setCountdown(null);
            return;
        }
        timerRef.current = setTimeout(() => {
            setCountdown(prev => (prev !== null ? prev - 1 : null));
        }, 1000);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [countdown, onComplete]);

    return (
        <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[styles.button, style]}
        >
            <IconAntDesign name="setting" size={iconSize} color={"white"} />
            {countdown !== null && (
                <Text allowFontScaling={false} style={styles.countdownText}>{fTranslate("OpenIn", countdown)}</Text>
            )}
        </Pressable>
    );
};

const styles = StyleSheet.create({
    button: {
        position: "absolute",
        right: 15, zIndex: 600,
        flexDirection: "row-reverse",
        alignItems: "center",
        justifyContent: "flex-start"
    },
    countdownText: {
        margin: 10,
        paddingRight: 10,
        paddingLeft: 10,
        fontSize: 20,
        borderRadius:12,
        //width: 250,
        marginRight:20,
        textAlign: "right",
        color: "black",
        backgroundColor:"white"
    },
});