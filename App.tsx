import React, { useContext } from "react";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider } from "react-native-paper";
import TabNavigator from "./src/navigation/TabNavigator";
import { AppProvider, AppContext } from "./src/context/AppContext";
import { useCallReceiverListener } from "./src/hooks/useCallReceiverListener";
import AuthGate from "./src/screens/AuthGate";
import { paperTheme, navigationTheme, colors } from "./src/theme/theme";

function Root() {
  useCallReceiverListener();
  return <TabNavigator />;
}

function MainNavigator() {
  const { authenticated, setAuthenticated, syncClientProfile } = useContext(AppContext);

  return (
    <NavigationContainer theme={navigationTheme}>
      {authenticated ? (
        <Root />
      ) : (
        <AuthGate
          onAuthenticated={() => setAuthenticated(true)}
          onClientLoaded={(client) => syncClientProfile(client)}
        />
      )}
    </NavigationContainer>
  );
}

const App = () => {
  return (
    <AppProvider>
      <PaperProvider theme={paperTheme}>
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" backgroundColor={colors.bgCanvas} />
          <MainNavigator />
        </SafeAreaProvider>
      </PaperProvider>
    </AppProvider>
  );
};

export default App;
