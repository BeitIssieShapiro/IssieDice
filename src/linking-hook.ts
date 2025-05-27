import { AppState, Linking } from 'react-native';
import { useContext, useEffect, useRef } from 'react';
import { GlobalContext } from './global-context';

export function useIncomingURL(onLinkReceived: (url: string) => void) {
    const appState = useRef<string>(AppState.currentState);
    const handledLink = useRef<string | null>(null);
    const context = useContext(GlobalContext);

    useEffect(() => {
        const handleUrl = ({ url }: { url: string }) => {
            if (url !== handledLink.current) {
                handledLink.current = url;
                onLinkReceived(url);
            }
        };

        const handleAppStateChange = async (nextState: string) => {
            if (appState.current.match(/inactive|background/) && nextState === 'active') {
                const url = await Linking.getInitialURL();
                if (url && url !== handledLink.current) {
                    handleUrl({ url });
                }
            }
            appState.current = nextState;
        };

        const linkingUrlSubscription = Linking.addEventListener('url', handleUrl);
        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

        // Handle initial cold start link
        (async () => {
            if (context && context.url) {
                setTimeout(() => handleUrl({ url: context.url}));
            } else {
                const url = await Linking.getInitialURL();
                if (url) {
                    setTimeout(() => handleUrl({ url}));
                }
            }
        })();

        return () => {
            linkingUrlSubscription.remove();
            appStateSubscription.remove();
        };
    
    }, [onLinkReceived]);
}
