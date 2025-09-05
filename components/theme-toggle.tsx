'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const getNextTheme = () => {
    switch (theme) {
      case 'light':
        return 'dark';
      case 'dark':
        return 'system';
      case 'system':
      default:
        return 'light';
    }
  };

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'system':
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return '라이트 모드';
      case 'dark':
        return '다크 모드';
      case 'system':
      default:
        return '시스템 설정';
    }
  };

  return (
    <div className="flex items-center justify-between">
      <label className="text-sm">테마</label>
      <button
        onClick={() => setTheme(getNextTheme())}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-background hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
        title={`현재: ${getLabel()}. 클릭하여 변경`}
      >
        {getIcon()}
        <span className="text-xs text-muted-foreground">
          {getLabel()}
        </span>
      </button>
    </div>
  );
}