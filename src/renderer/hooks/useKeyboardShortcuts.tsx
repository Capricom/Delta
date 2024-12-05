import { useHotkeys } from 'react-hotkeys-hook';

interface UseKeyboardShortcutsProps {
    setSidebarOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
    setIsFullScreen: (value: 'flow' | 'chat' | 'none' | ((prev: string) => string)) => void;
    handleNewConversation: (focusCallback?: () => void) => void;
    focusChatTextArea: () => void;
    setIsConfigModalOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
}

export function useKeyboardShortcuts({
    setSidebarOpen,
    setIsFullScreen,
    handleNewConversation,
    focusChatTextArea,
    setIsConfigModalOpen,
}: UseKeyboardShortcutsProps) {
    useHotkeys('alt+s', () => setSidebarOpen(prev => !prev), []);
    useHotkeys('alt+f', () => {
        setIsFullScreen(prev => prev === 'flow' ? 'none' : 'flow');
    }, []);
    useHotkeys('alt+c', () => {
        setIsFullScreen(prev => prev === 'chat' ? 'none' : 'chat');
    }, []);
    useHotkeys('alt+n', (e) => {
        e.preventDefault();
        handleNewConversation();
    }, { preventDefault: true });
    useHotkeys('alt+l', (e) => {
        e.preventDefault();
        focusChatTextArea();
    }, { preventDefault: true });
    useHotkeys('alt+e', () => setIsConfigModalOpen(prev => !prev), []);
}
