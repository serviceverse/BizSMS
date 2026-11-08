import { useEffect } from 'react';



import { DeviceEventEmitter } from "react-native";

export const useCallEvents = (onCallEnded: (number: string) => void) => {
    useEffect(() => {
        const sub = DeviceEventEmitter.addListener("CallEnded", onCallEnded);

        return () => {
            sub.remove();
        };
    }, [onCallEnded]);
};