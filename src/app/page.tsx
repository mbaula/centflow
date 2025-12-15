"use client";
import Tabs from '@/components/Tabs';
import TextInput from '@/components/TextInput';
import ScheduleInput from '@/components/ScheduleInput';

export default function Home() {
  const tabs = [
    {
      id: 'home',
      label: 'Home',
      content: (
        <div>
          <h2 className="text-xl font-semibold mb-4">Schedule Import</h2>
          <ScheduleInput />
        </div>
      ),
    },
    {
      id: 'centennial',
      label: 'Centennial Flow',
      content: (
        <div>
          <h2 className="text-xl font-semibold mb-4">Centennial Course Schedule</h2>
          <TextInput />
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-8 text-center">centflow</h1>
      <Tabs tabs={tabs} defaultTab="home" />
    </div>
  );
}
