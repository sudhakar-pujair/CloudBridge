import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { WelcomeTab } from "@/components/tabs/welcome-tab";
import { SSHTab } from "@/components/tabs/ssh-tab";
import { ActivitiesTab } from "@/components/tabs/activities-tab";
import { SettingsTab } from "@/components/tabs/settings-tab";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem("activeMainTab");
    return savedTab || "welcome";
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    localStorage.setItem("activeMainTab", tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "welcome":
        return <WelcomeTab />;
      case "ssh":
        return <SSHTab />;
      case "activities":
        return <ActivitiesTab />;
      case "settings":
        return <SettingsTab />;
      default:
        return <WelcomeTab />;
    }
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
      <main className="flex-1 overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
}
