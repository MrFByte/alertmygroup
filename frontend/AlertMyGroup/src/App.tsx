import { Route, Switch, useLocation } from 'wouter';
import { useTheme } from './hooks/useTheme';
import { useLocalChannels } from './hooks/useLocalChannels';
import { api } from './api/client';
import HomePage from './pages/HomePage';
import JoinPage from './pages/JoinPage';
import ChannelPage from './pages/ChannelPage';
import RingPage from './pages/RingPage';
import type { Theme } from './types';
import type { useLocalChannels as LocalChannelsHook } from './hooks/useLocalChannels';

type LocalChannels = ReturnType<typeof LocalChannelsHook>;

interface SharedProps {
  theme: Theme;
  onToggleTheme: () => void;
  localChannels: LocalChannels;
}

function ChannelRouter({ params, shared }: { params: { code: string }; shared: SharedProps }) {
  const { theme, onToggleTheme, localChannels } = shared;
  const [, navigate] = useLocation();
  const existing = localChannels.get(params.code);

  const handleJoin = async (code: string, password: string, displayName: string) => {
    const { memberId, name: channelName } = await api.joinChannel(code, password, displayName);
    localChannels.save({ code, memberId, name: displayName, channelName });
    navigate(`/c/${code}`);
  };

  if (existing) {
    return (
      <ChannelPage
        code={params.code}
        theme={theme}
        onToggleTheme={onToggleTheme}
        localChannels={localChannels}
      />
    );
  }

  return (
    <JoinPage
      code={params.code}
      theme={theme}
      onToggleTheme={onToggleTheme}
      localChannels={localChannels}
      onJoin={handleJoin}
    />
  );
}

export default function App() {
  const { theme, toggle } = useTheme();
  const localChannels = useLocalChannels();
  const [, navigate] = useLocation();

  const shared: SharedProps = { theme, onToggleTheme: toggle, localChannels };

  const handleCreateChannel = async (channelName: string, password: string, displayName: string) => {
    const { code, memberId } = await api.createChannel(channelName, password, displayName);
    localChannels.save({ code, memberId, name: displayName, channelName });
    navigate(`/c/${code}`);
  };

  return (
    <Switch>
      <Route path="/">
        <HomePage
          theme={theme}
          onToggleTheme={toggle}
          localChannels={localChannels}
          onCreateChannel={handleCreateChannel}
        />
      </Route>

      <Route path="/c/:code">
        {(params) => params
          ? <ChannelRouter params={params} shared={shared} />
          : null}
      </Route>

      <Route<{ id: string }> path="/r/:id">
        {(params) => params?.id ? (
          <RingPage
            ringId={params.id}
            theme={theme}
            onToggleTheme={toggle}
            localChannels={localChannels}
          />
        ) : null}
      </Route>

      <Route>
        <HomePage
          theme={theme}
          onToggleTheme={toggle}
          localChannels={localChannels}
          onCreateChannel={handleCreateChannel}
        />
      </Route>
    </Switch>
  );
}
