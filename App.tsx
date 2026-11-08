import React, { useState } from "react";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider } from "react-native-paper";
import TabNavigator from "./src/navigation/TabNavigator";
import { AppProvider } from "./src/context/AppContext";
import { useCallReceiverListener } from "./src/hooks/useCallReceiverListener";
import AuthGate from "./src/screens/AuthGate";
import { paperTheme, navigationTheme, colors } from "./src/theme/theme";

function Root() {
  useCallReceiverListener();
  return <TabNavigator />;
}

const App = () => {
  const [authenticated, setAuthenticated] = useState(false);

  return (
    <AppProvider>
      <PaperProvider theme={paperTheme}>
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" backgroundColor={colors.bgCanvas} />

          <NavigationContainer theme={navigationTheme}>
            {authenticated ? (
              <Root />
            ) : (
              <AuthGate onAuthenticated={() => setAuthenticated(true)} />
            )}
          </NavigationContainer>
        </SafeAreaProvider>
      </PaperProvider>
    </AppProvider>
  );
};

export default App;
