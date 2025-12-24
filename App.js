import "react-native-gesture-handler";
import React, { useState } from "react";
import { Platform, UIManager } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import LoadingScreen from "./src/components/LoadingScreen";



export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoadingFinish = () => {
    setIsLoading(false);
  };

  return (
    <SafeAreaProvider>
      <AppNavigator />
      {isLoading && <LoadingScreen onFinish={handleLoadingFinish} />}
    </SafeAreaProvider>
  );
}
