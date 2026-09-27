import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Settings as SettingsIcon,
  Trash2,
  Copy,
  Check,
  Paperclip,
  ArrowUp,
  Square,
  Search,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  FolderArchive,
  Terminal,
  Edit2,
  X,
  PanelLeft,
  Sparkles,
  Share2,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  VolumeX,
  RotateCw,
  Globe,
  Mic,
  MoreHorizontal,
  Compass,
  FileText,
  Code,
  Lightbulb,
  ExternalLink,
  ShieldCheck,
  Pencil,
  Download,
  Linkedin,
  Github,
  CheckSquare,
  AlertTriangle,
  Pin,
  PinOff,
  GitFork,
  Sliders,
  Keyboard,
  History,
  FileCode,
  RotateCcw,
  Cpu,
  SlidersHorizontal
} from 'lucide-react';
import { Message, ChatSession, AppSettings, OllamaModelInfo, DEFAULT_SETTINGS } from './types';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { ClawTearLogo } from './components/ClawTearLogo';

export default function App() {
  // Navigation & Modals
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'model' | 'personalization' | 'speech' | 'data' | 'shortcuts'>('general');
  const [resetFeedbackMsg, setResetFeedbackMsg] = useState<string | null>(null);
  const [confirmResetAll, setConfirmResetAll] = useState<boolean>(false);

  // Model & Temporary Chat Dropdown
  const [showModelMenu, setShowModelMenu] = useState<boolean>(false);
  const [temporaryChat, setTemporaryChat] = useState<boolean>(false);
  const [tempChatSession, setTempChatSession] = useState<ChatSession | null>(null);
  const [activeMenuChatId, setActiveMenuChatId] = useState<string | null>(null);

  // Settings state with localStorage persistence
  const [settings, setSettings] = useState<AppSettings>(() => {
    const savedTheme = (localStorage.getItem('clawtear_theme') as 'dark' | 'light' | 'tokyo-night' | 'system') || 'dark';
    const savedSettings = localStorage.getItem('clawtear_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          theme: parsed.theme || savedTheme
        };
      } catch (e) {
        console.error('Failed to parse saved settings', e);
      }
    }
    return {
      ...DEFAULT_SETTINGS,
      theme: savedTheme
    };
  });

  // Save settings on changes
  useEffect(() => {
    try {
      localStorage.setItem('clawtear_settings', JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }, [settings]);

  // Model & App settings reset helpers
  const handleResetModelSettings = () => {
    setSettings(prev => ({
      ...prev,
      defaultModel: DEFAULT_SETTINGS.defaultModel,
      temperature: DEFAULT_SETTINGS.temperature,
      contextWindow: DEFAULT_SETTINGS.contextWindow,
      maxTokens: DEFAULT_SETTINGS.maxTokens,
      topP: DEFAULT_SETTINGS.topP,
      topK: DEFAULT_SETTINGS.topK,
      repeatPenalty: DEFAULT_SETTINGS.repeatPenalty
    }));
    setResetFeedbackMsg('Model output range & parameters reset to defaults');
    setTimeout(() => setResetFeedbackMsg(null), 3500);
  };

  const handleResetAllSettings = () => {
    setSettings(prev => ({
      ...DEFAULT_SETTINGS,
      theme: prev.theme
    }));
    setConfirmResetAll(false);
    setResetFeedbackMsg('All settings restored to default values');
    setTimeout(() => setResetFeedbackMsg(null), 3500);
  };

  // Chat State
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>('');
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [ollamaConnected, setOllamaConnected] = useState<boolean>(false);
  const [installedOllamaModels, setInstalledOllamaModels] = useState<OllamaModelInfo[]>([]);
  
  // Real model selector state
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    const saved = localStorage.getItem('clawtear_selected_model');
    if (saved && !saved.startsWith('Claw Tear') && saved !== 'qwen2.5:1.5b') return saved;
    return 'qwen3:4b';
  });

  useEffect(() => {
    if (selectedModel && !selectedModel.startsWith('Claw Tear')) {
      localStorage.setItem('clawtear_selected_model', selectedModel);
    }
  }, [selectedModel]);

  // Interactive message state
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [likedMap, setLikedMap] = useState<{ [id: string]: 'liked' | 'disliked' | null }>({});
  const [expandedReasoningMap, setExpandedReasoningMap] = useState<{ [id: string]: boolean }>({});
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editChatTitle, setEditChatTitle] = useState<string>('');
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingMsgText, setEditingMsgText] = useState<string>('');
  const [attachments, setAttachments] = useState<{ name: string; size: number; content: string }[]>([]);
  const [webSearchActive, setWebSearchActive] = useState<boolean>(false);
  const [reasonActive, setReasonActive] = useState<boolean>(false);
  const [chatMode, setChatMode] = useState<'chat' | 'work'>('chat');

  // Multi-chat selection & bulk deletion state
  const [isSelectingChats, setIsSelectingChats] = useState<boolean>(false);
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState<boolean>(false);

  // Additional UX States: Shortcuts, Drag&Drop, Message Fork/Edit, File Validation
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [editingUserMsgId, setEditingUserMsgId] = useState<string | null>(null);
  const [editingUserMsgText, setEditingUserMsgText] = useState<string>('');
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [downloadedMsgId, setDownloadedMsgId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const emptyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModelMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Theme Toggler
  const toggleTheme = () => {
    setSettings(prev => {
      let nextTheme: 'dark' | 'light' | 'tokyo-night';
      if (prev.theme === 'dark') {
        nextTheme = 'tokyo-night';
      } else if (prev.theme === 'tokyo-night') {
        nextTheme = 'light';
      } else {
        nextTheme = 'dark';
      }
      localStorage.setItem('clawtear_theme', nextTheme);
      return { ...prev, theme: nextTheme };
    });
  };

  // Theme Sync
  useEffect(() => {
    const applyTheme = () => {
      document.documentElement.classList.remove('dark', 'tokyo-night', 'light');
      document.documentElement.removeAttribute('data-theme');

      if (settings.theme === 'tokyo-night') {
        document.documentElement.classList.add('dark', 'tokyo-night');
        document.documentElement.setAttribute('data-theme', 'tokyo-night');
      } else if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else if (settings.theme === 'light') {
        document.documentElement.classList.add('light');
        document.documentElement.setAttribute('data-theme', 'light');
      } else if (settings.theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDark) {
          document.documentElement.classList.add('dark');
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.classList.add('light');
          document.documentElement.setAttribute('data-theme', 'light');
        }
      }
    };

    applyTheme();

    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [settings.theme]);

  // Initial Chat Sessions Load
  useEffect(() => {
    const savedChats = localStorage.getItem('clawtear_sessions') || localStorage.getItem('chatgpt_sessions');
    if (savedChats) {
      try {
        const parsed = JSON.parse(savedChats);
        if (parsed.length > 0) {
          setChats(parsed);
          setCurrentChatId(parsed[0].id);
          return;
        }
      } catch (e) {
        console.error('Failed to parse saved chats', e);
      }
    }
    initNewChat();
  }, []);

  // Save chats
  useEffect(() => {
    if (chats.length > 0 && !temporaryChat) {
      localStorage.setItem('clawtear_sessions', JSON.stringify(chats));
    }
  }, [chats, temporaryChat]);

  // Check Ollama connection with proxy fallback
  useEffect(() => {
    checkOllama();
    const interval = setInterval(checkOllama, 20000);
    return () => clearInterval(interval);
  }, [settings.ollamaUrl]);

  const checkOllama = async () => {
    try {
      const isLocalhost =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

      let res: Response | null = null;

      // 1. If running on local server (server.js), query /api/models directly
      if (isLocalhost) {
        try {
          res = await fetch('/api/models');
        } catch {}
      }

      // 2. Otherwise try direct Ollama or proxy
      if (!res || !res.ok) {
        try {
          res = await fetch(`${settings.ollamaUrl}/api/tags`, { mode: 'cors' });
        } catch {
          if (isLocalhost) {
            res = await fetch(`/api/ollama/api/tags`).catch(() => null);
          }
        }
      }

      if (res && res.ok) {
        const data = await res.json();
        const models: OllamaModelInfo[] = (data.models || [])
          .map((m: any) => ({
            name: m.name || m.model || '',
            size: m.size || 0,
            modified_at: m.modified_at || '',
            details: m.details || {}
          }))
          .filter((m: OllamaModelInfo) => Boolean(m.name));
        setInstalledOllamaModels(models);
        setOllamaConnected(true);
        if (models.length > 0) {
          setSelectedModel(prev => {
            if (!prev || prev.startsWith('Claw Tear') || !models.some(m => m.name === prev)) {
              return models[0].name;
            }
            return prev;
          });
        }
      } else {
        setOllamaConnected(false);
      }
    } catch {
      setOllamaConnected(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${Math.round(mb)} MB`;
  };

  const currentChat = (temporaryChat && tempChatSession)
    ? tempChatSession
    : chats.find(c => c.id === currentChatId) || chats[0];

  const handleToggleTemporaryChat = (forced?: boolean) => {
    const nextState = typeof forced === 'boolean' ? forced : !temporaryChat;
    if (nextState) {
      const freshTemp: ChatSession = {
        id: 'temp_chat_' + Date.now(),
        title: 'Temporary chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        model: selectedModel,
        messages: [],
        isTemporary: true
      };
      setTempChatSession(freshTemp);
      setTemporaryChat(true);
      setShowModelMenu(false);
    } else {
      setTempChatSession(null);
      setTemporaryChat(false);
      setShowModelMenu(false);
    }
  };

  const updateCurrentChatMessages = (
    updater: (prevMessages: Message[]) => Message[],
    titleUpdate?: string
  ) => {
    if (temporaryChat) {
      setTempChatSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          title: titleUpdate || prev.title,
          updatedAt: Date.now(),
          messages: updater(prev.messages)
        };
      });
    } else {
      setChats(prev =>
        prev.map(c => {
          if (c.id !== currentChatId) return c;
          return {
            ...c,
            title: titleUpdate || c.title,
            updatedAt: Date.now(),
            messages: updater(c.messages)
          };
        })
      );
    }
  };

  const initNewChat = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }

    if (temporaryChat) {
      const freshTemp: ChatSession = {
        id: 'temp_chat_' + Date.now(),
        title: 'Temporary chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        model: selectedModel,
        messages: [],
        isTemporary: true
      };
      setTempChatSession(freshTemp);
      setAttachments([]);
      setTimeout(() => textareaRef.current?.focus(), 50);
      return;
    }

    const newChat: ChatSession = {
      id: 'chat_' + Date.now(),
      title: 'New chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: selectedModel,
      messages: []
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setAttachments([]);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleDeleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveMenuChatId(null);
    const remaining = chats.filter(c => c.id !== id);
    if (remaining.length === 0) {
      const newChat: ChatSession = {
        id: 'chat_' + Date.now(),
        title: 'New chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        model: selectedModel,
        messages: []
      };
      setChats([newChat]);
      setCurrentChatId(newChat.id);
      localStorage.setItem('clawtear_sessions', JSON.stringify([newChat]));
    } else {
      setChats(remaining);
      localStorage.setItem('clawtear_sessions', JSON.stringify(remaining));
      if (currentChatId === id) {
        setCurrentChatId(remaining[0].id);
      }
    }
  };

  const toggleChatSelection = (id: string) => {
    setSelectedChatIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllToggle = () => {
    const nonTempChats = chats.filter(c => !c.isTemporary);
    if (selectedChatIds.length === nonTempChats.length && nonTempChats.length > 0) {
      setSelectedChatIds([]);
    } else {
      setSelectedChatIds(nonTempChats.map(c => c.id));
    }
  };

  const handleOpenBulkDelete = () => {
    if (selectedChatIds.length === 0) return;
    setShowBulkDeleteModal(true);
  };

  const handleConfirmBulkDelete = () => {
    if (selectedChatIds.length === 0) return;

    const remaining = chats.filter(c => !selectedChatIds.includes(c.id));
    if (remaining.length === 0) {
      const newChat: ChatSession = {
        id: 'chat_' + Date.now(),
        title: 'New chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        model: selectedModel,
        messages: []
      };
      setChats([newChat]);
      setCurrentChatId(newChat.id);
      localStorage.setItem('clawtear_sessions', JSON.stringify([newChat]));
    } else {
      setChats(remaining);
      localStorage.setItem('clawtear_sessions', JSON.stringify(remaining));
      if (selectedChatIds.includes(currentChatId)) {
        setCurrentChatId(remaining[0].id);
      }
    }

    setSelectedChatIds([]);
    setIsSelectingChats(false);
    setShowBulkDeleteModal(false);
  };

  const startRenameChat = (e: React.MouseEvent, chat: ChatSession) => {
    e.stopPropagation();
    setActiveMenuChatId(null);
    setEditingChatId(chat.id);
    setEditChatTitle(chat.title);
  };

  const saveRenameChat = (id: string) => {
    if (editChatTitle.trim()) {
      setChats(prev =>
        prev.map(c => (c.id === id ? { ...c, title: editChatTitle.trim(), updatedAt: Date.now() } : c))
      );
    }
    setEditingChatId(null);
  };

  // Pin / Unpin Chat
  const handleTogglePinChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setActiveMenuChatId(null);
    setChats(prev => {
      const next = prev.map(c => (c.id === chatId ? { ...c, pinned: !c.pinned } : c));
      localStorage.setItem('clawtear_sessions', JSON.stringify(next));
      return next;
    });
  };

  // Branch / Fork Chat from a specific message
  const handleForkChat = (fromMessageId: string) => {
    if (!currentChat) return;
    const msgIndex = currentChat.messages.findIndex(m => m.id === fromMessageId);
    if (msgIndex === -1) return;

    const forkedMessages = currentChat.messages.slice(0, msgIndex + 1);
    const newChat: ChatSession = {
      id: 'chat_' + Date.now(),
      title: `Branch of ${currentChat.title.slice(0, 24)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: selectedModel,
      messages: forkedMessages
    };

    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
  };

  // Export Chat as Markdown or JSON
  const handleExportChat = (e: React.MouseEvent, chatId: string, format: 'md' | 'json') => {
    e.stopPropagation();
    setActiveMenuChatId(null);
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(chat, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chat.title.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() || 'chat'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      let md = `# ${chat.title}\n\n`;
      md += `*Model:* ${chat.model}  \n`;
      md += `*Date:* ${new Date(chat.createdAt).toLocaleString()}  \n\n---\n\n`;
      chat.messages.forEach(m => {
        md += `### ${m.role === 'user' ? 'User' : 'Assistant'}\n\n`;
        if (m.thinking) {
          md += `> **Reasoning:**\n> ${m.thinking.split('\n').join('\n> ')}\n\n`;
        }
        md += `${m.content}\n\n---\n\n`;
      });
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chat.title.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() || 'chat'}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Export all chats as backup JSON
  const handleExportAllChats = () => {
    const nonTemp = chats.filter(c => !c.isTemporary);
    const blob = new Blob([JSON.stringify(nonTemp, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clawtear_chats_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import chats backup JSON
  const handleImportChatsFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChats(prev => {
            const combined = [...parsed, ...prev.filter(c => !parsed.some((p: any) => p.id === c.id))];
            localStorage.setItem('clawtear_sessions', JSON.stringify(combined));
            return combined;
          });
          if (parsed[0]?.id) setCurrentChatId(parsed[0].id);
        }
      } catch (err) {
        console.error('Failed to parse backup', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Strictly validate that files are NOT media (images/videos/audios are forbidden per user requirement)
  const isMediaFile = (file: File): boolean => {
    const type = (file.type || '').toLowerCase();
    if (type.startsWith('image/') || type.startsWith('video/') || type.startsWith('audio/')) {
      return true;
    }
    const name = file.name.toLowerCase();
    const mediaExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.ico', '.tiff', '.heic', '.avif',
      '.mp4', '.mov', '.avi', '.mkv', '.webm', '.wmv', '.flv', '.3gp', '.m4v', '.mpg', '.mpeg',
      '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'
    ];
    return mediaExtensions.some(ext => name.endsWith(ext));
  };

  // Safe file processor: strictly only code, document, and text files
  const processFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const mediaFiles = fileArray.filter(isMediaFile);
    const validFiles = fileArray.filter(f => !isMediaFile(f));

    if (mediaFiles.length > 0) {
      const names = mediaFiles.map(f => `"${f.name}"`).slice(0, 2).join(', ');
      setFileUploadError(
        `Images and videos are not allowed. Please attach code, document, or text files only (${names}${
          mediaFiles.length > 2 ? ` + ${mediaFiles.length - 2} more` : ''
        } rejected).`
      );
      setTimeout(() => setFileUploadError(null), 6000);
    }

    if (validFiles.length === 0) return;

    validFiles.forEach(file => {
      // 10MB limit check
      if (file.size > 10 * 1024 * 1024) {
        setFileUploadError(`File "${file.name}" exceeds the 10MB limit.`);
        setTimeout(() => setFileUploadError(null), 5000);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            content: (reader.result as string) || ''
          }
        ]);
      };
      reader.readAsText(file);
    });
  };

  // Download generated code from an assistant message as a file
  const handleDownloadCodeFromMessage = (content: string, msgId: string) => {
    const codeBlockRegex = /```([a-z0-9_-]*)\n([\s\S]*?)```/gi;
    const matches: { lang: string; code: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = codeBlockRegex.exec(content)) !== null) {
      matches.push({ lang: m[1] || 'text', code: m[2] });
    }

    const EXT_MAP: Record<string, string> = {
      javascript: '.js', js: '.js', typescript: '.ts', ts: '.ts', tsx: '.tsx', jsx: '.jsx',
      java: '.java', c: '.c', cpp: '.cpp', 'c++': '.cpp', cs: '.cs', csharp: '.cs',
      html: '.html', css: '.css', python: '.py', py: '.py', sql: '.sql', json: '.json',
      rust: '.rs', rs: '.rs', go: '.go', golang: '.go', bash: '.sh', sh: '.sh',
      shell: '.sh', bat: '.bat', batch: '.bat', ruby: '.rb', rb: '.rb', php: '.php',
      swift: '.swift', kotlin: '.kt', kt: '.kt', yaml: '.yaml', yml: '.yml', xml: '.xml',
      markdown: '.md', md: '.md', text: '.txt'
    };

    if (matches.length === 0) {
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `response_${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      matches.forEach((item, idx) => {
        const cleanLang = item.lang.toLowerCase();
        const ext = EXT_MAP[cleanLang] || `.${cleanLang || 'txt'}`;
        const blob = new Blob([item.code], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = matches.length === 1 ? `code${ext}` : `code_${idx + 1}${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    setDownloadedMsgId(msgId);
    setTimeout(() => setDownloadedMsgId(null), 2000);
  };

  // Drag and drop handlers for attachments
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Global Keyboard Shortcuts (⌘K search, ⌘N new chat, ⌘/ shortcuts, Esc)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

      if (isCmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSidebarOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        initNewChat();
      } else if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsSelectingChats(prev => {
          const next = !prev;
          if (!next) setSelectedChatIds([]);
          return next;
        });
      } else if (isCmdOrCtrl && e.key === '/') {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
      } else if (e.key === 'Escape') {
        setShowModelMenu(false);
        setShowSettingsModal(false);
        setShowShortcutsModal(false);
        setShowBulkDeleteModal(false);
        setActiveMenuChatId(null);
        setEditingUserMsgId(null);
        if (isSelectingChats) {
          setIsSelectingChats(false);
          setSelectedChatIds([]);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isSelectingChats]);

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = (customPrompt !== undefined ? customPrompt : inputPrompt).trim();
    if (!promptToSend && attachments.length === 0) return;
    if (isGenerating) return;

    const userMessage: Message = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: promptToSend,
      timestamp: Date.now(),
      attachments: [...attachments]
    };

    const updatedMessages = [...(currentChat?.messages || []), userMessage];
    const newTitle =
      currentChat?.title === 'New chat'
        ? (promptToSend || attachments[0]?.name || 'Chat').slice(0, 32)
        : currentChat?.title || 'Chat';

    const assistantPlaceholderId = 'msg_' + (Date.now() + 1);
    const assistantMessage: Message = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '',
      thinking: '',
      timestamp: Date.now(),
      model: selectedModel
    };

    updateCurrentChatMessages(() => [...updatedMessages, assistantMessage], newTitle);
    setInputPrompt('');
    setAttachments([]);
    setIsGenerating(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);

    abortControllerRef.current = new AbortController();
    const startTime = performance.now();

    if (ollamaConnected) {
      try {
        const conversationHistory = updatedMessages.map(m => {
          let fullContent = m.content;
          if (m.attachments && m.attachments.length > 0) {
            const fileBlocks = m.attachments
              .filter(att => att.content)
              .map(att => `[File: ${att.name}]\n\`\`\`\n${att.content}\n\`\`\``)
              .join('\n\n');
            if (fileBlocks) {
              fullContent = fullContent
                ? `${fullContent}\n\nAttached Files:\n${fileBlocks}`
                : `Attached Files:\n${fileBlocks}`;
            }
          }
          return {
            role: m.role,
            content: fullContent
          };
        });

        // Dynamically resolve model tag from installed Ollama models
        let actualModelTag = selectedModel;
        const matchingInstalled = installedOllamaModels.find(
          m => m.name.toLowerCase() === selectedModel.toLowerCase() ||
               m.name.split(':')[0].toLowerCase() === selectedModel.toLowerCase()
        );

        if (matchingInstalled) {
          actualModelTag = matchingInstalled.name;
        } else if (installedOllamaModels.length > 0) {
          if (reasonActive || selectedModel.includes('o1')) {
            const reasoningModel = installedOllamaModels.find(m =>
              m.name.toLowerCase().includes('r1') || m.name.toLowerCase().includes('deepseek')
            );
            actualModelTag = reasoningModel ? reasoningModel.name : installedOllamaModels[0].name;
          } else if (selectedModel.includes('Mini')) {
            const miniModel = installedOllamaModels.find(m =>
              m.name.toLowerCase().includes('1b') || m.name.toLowerCase().includes('mini') || m.name.toLowerCase().includes('llama')
            );
            actualModelTag = miniModel ? miniModel.name : installedOllamaModels[0].name;
          } else {
            const defaultModel = installedOllamaModels.find(m =>
              m.name.toLowerCase().includes('qwen') || m.name.toLowerCase().includes('1.5b')
            );
            actualModelTag = defaultModel ? defaultModel.name : installedOllamaModels[0].name;
          }
        }

        // Apply Deep Reasoning (Think) instruction when active
        let effectiveSystemPrompt = settings.systemPrompt;
        if (reasonActive || selectedModel.includes('o1')) {
          effectiveSystemPrompt += '\n\n[CRITICAL INSTRUCTION: Think / Deep Reasoning mode is ACTIVATED. Before writing your answer, you MUST enclose your thorough internal step-by-step thinking and analysis within <think> and </think> tags. Consider assumptions, edge cases, algorithms, and logical proofs inside the tags. After </think>, provide your finalized clear response.]';
        }

        let res: Response | null = null;
        const isLocalhost =
          typeof window !== 'undefined' &&
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

        const chatPayload = {
          model: actualModelTag,
          messages: [{ role: 'system', content: effectiveSystemPrompt }, ...conversationHistory],
          stream: true,
          options: {
            temperature: settings.temperature,
            num_ctx: settings.contextWindow,
            num_predict: settings.maxTokens,
            top_p: settings.topP ?? 0.9,
            top_k: settings.topK ?? 40,
            repeat_penalty: settings.repeatPenalty ?? 1.1
          }
        };

        // 1. If running locally on server.js, call /api/chat directly
        if (isLocalhost) {
          try {
            res = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: abortControllerRef.current.signal,
              body: JSON.stringify(chatPayload)
            });
          } catch {}
        }

        // 2. Otherwise try direct Ollama or proxy fallback
        if (!res || !res.ok) {
          try {
            res = await fetch(`${settings.ollamaUrl}/api/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: abortControllerRef.current.signal,
              body: JSON.stringify(chatPayload)
            });
          } catch (fetchErr) {
            if (isLocalhost) {
              res = await fetch(`/api/ollama/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: abortControllerRef.current.signal,
                body: JSON.stringify(chatPayload)
              });
            } else {
              throw fetchErr;
            }
          }
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accContent = '';
        let accThinking = '';
        let evalCount = 0;
        let evalDuration = 0;
        let finalThoughtTime = 0;

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim()) continue;
              const parsed = JSON.parse(line);
              if (parsed.message?.thinking) accThinking += parsed.message.thinking;
              if (parsed.message?.content) accContent += parsed.message.content;
              if (parsed.response) accContent += parsed.response;
              if (parsed.eval_count) evalCount = parsed.eval_count;
              if (parsed.eval_duration) evalDuration = parsed.eval_duration;

              let displayContent = accContent;
              let displayThinking = accThinking;

              if (displayContent.includes('<think>')) {
                const parts = displayContent.split('</think>');
                if (parts.length > 1) {
                  displayThinking = (displayThinking ? displayThinking + '\n' : '') + parts[0].replace(/<think>/g, '').trim();
                  displayContent = parts.slice(1).join('</think>').trim();
                  if (!finalThoughtTime) {
                    finalThoughtTime = Math.max(1, Math.round((performance.now() - startTime) / 1000));
                  }
                } else {
                  displayThinking = displayContent.replace(/<think>/g, '').trim();
                  displayContent = '';
                }
              }

              updateCurrentChatMessages(msgs => {
                const next = [...msgs];
                const lastIdx = next.findIndex(m => m.id === assistantPlaceholderId);
                if (lastIdx !== -1) {
                  next[lastIdx] = {
                    ...next[lastIdx],
                    content: displayContent,
                    thinking: displayThinking || undefined,
                    thinkingTime: finalThoughtTime || (displayThinking ? Math.max(1, Math.round((performance.now() - startTime) / 1000)) : undefined)
                  };
                }
                return next;
              });
            }
          }
        }

        const durationSeconds = evalDuration > 0 ? evalDuration / 1e9 : (performance.now() - startTime) / 1000;
        const speed = durationSeconds > 0 ? (evalCount || accContent.split(/\s+/).length) / durationSeconds : 34;

        updateCurrentChatMessages(msgs => {
          const next = [...msgs];
          const lastIdx = next.findIndex(m => m.id === assistantPlaceholderId);
          if (lastIdx !== -1) {
            next[lastIdx] = {
              ...next[lastIdx],
              tokensPerSec: Math.round(speed * 10) / 10,
              thinkingTime: finalThoughtTime || msgs[lastIdx].thinkingTime
            };
          }
          return next;
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          runSimulatedResponse(promptToSend, assistantPlaceholderId, startTime);
        }
      } finally {
        setIsGenerating(false);
      }
    } else {
      runSimulatedResponse(promptToSend, assistantPlaceholderId, startTime);
    }
  };

  const runSimulatedResponse = async (
    prompt: string,
    assistantPlaceholderId: string,
    startTime: number
  ) => {
    let mockResponse = '';
    let mockThinking = '';
    const isReasoning = reasonActive || selectedModel.includes('o1');

    const lower = prompt.toLowerCase();
    if (lower.includes('code') || lower.includes('python') || lower.includes('script')) {
      if (isReasoning) {
        mockThinking = '1. Understand requirements: Write high-performance, robust Python code with zero third-party dependencies.\n2. Verify edge conditions: Non-existent files, encoding fallbacks, and memory considerations for large datasets.\n3. Structure implementation: Use pathlib for modern path safety and collections.Counter for O(N) frequency counts.\n4. Validate output format: Format tabular alignment and provide clear execution entry points.';
      }
      mockResponse = `Here is a complete, clean Python solution using modern standard libraries:

\`\`\`python
from collections import Counter
from pathlib import Path
import re

def analyze_document_frequencies(file_path: str, top_n: int = 10) -> None:
    """
    Reads a document and computes word frequencies cleanly.
    """
    target = Path(file_path)
    if not target.is_file():
        print(f"Error: '{file_path}' does not exist.")
        return

    # Normalize and tokenize
    raw_text = target.read_text(encoding="utf-8").lower()
    tokens = re.findall(r"\\b[a-z]{3,}\\b", raw_text)
    counter = Counter(tokens)

    print(f"Total tokens parsed: {len(tokens):,}")
    print(f"Unique vocabulary:   {len(counter):,}\\n")
    print(f"{'Rank':<5} | {'Term':<15} | {'Count':<6}")
    print("-" * 32)
    for rank, (word, count) in enumerate(counter.most_common(top_n), 1):
        print(f"{rank:<5} | {word:<15} | {count:<6}")

if __name__ == "__main__":
    analyze_document_frequencies("sample.txt", top_n=10)
\`\`\`

### Key Highlights
- **Zero External Dependencies**: Works out-of-the-box on standard Python 3.9+.
- **Pathlib Integration**: Cross-platform path handling for Windows and Linux.
- **Regex Word Boundaries**: Strips punctuation and digits cleanly using \`\\b[a-z]{3,}\\b\`.`;
    } else if (lower.includes('compare') || lower.includes('table') || lower.includes('difference')) {
      if (isReasoning) {
        mockThinking = '1. Clarify comparison parameters: Latency, hardware footprint, offline security, and maintenance cost.\n2. Synthesize tabular matrix comparing local CPU Ollama models against commercial remote APIs.\n3. Differentiate distinct use cases to provide actionable technical guidance.';
      }
      mockResponse = `Here is a detailed comparison of local on-device inference versus cloud-hosted APIs:

| Feature | Local Ollama (Qwen 2.5) | Cloud API (GPT-4o) |
|---|---|---|
| **Privacy** | 100% On-Device (Zero Telemetry) | Data sent to cloud servers |
| **Inference Speed** | 30–45 tokens/sec (CPU) | 40–70 tokens/sec |
| **Memory Footprint** | ~986 MB RAM | 0 MB local RAM |
| **Offline Support** | Fully Functional Without Internet | Requires continuous Internet |
| **Cost** | $0.00 (Free Forever) | Pay per 1M tokens |

### When to Use Which
1. **Use Local On-Device**: For private internal codebases, sensitive financial logs, offline travel, or zero-cost experiments.
2. **Use Cloud APIs**: For multi-modal video analysis or massive 128k context document summarization.`;
    } else if (lower.includes('summarize') || lower.includes('write')) {
      if (isReasoning) {
        mockThinking = '1. Identify key architectural themes from local chat ecosystem.\n2. Summarize core pillars: Zero-network exposure, CPU-friendly inference, and instant portability.\n3. Review concise bullet formatting for rapid scanning.';
      }
      mockResponse = `Here is a concise summary of the key objectives:

- **Primary Goal**: Deploy an exact, distraction-free ChatGPT clone for local private CPU inference.
- **Privacy Architecture**: All prompts and generated tokens reside in your browser and local Ollama instance.
- **Offline Readiness**: All source files (Batch launcher, Node proxy, and UI assets) run independently with zero npm packages.

Let me know if you would like me to adjust the tone, expand any section, or implement additional workflows.`;
    } else {
      if (isReasoning) {
        mockThinking = `1. Deconstruct query intent: "${prompt.slice(0, 40)}..."\n2. Establish parameters: CPU-only local session, concise and authoritative delivery.\n3. Formulate direct, actionable response.`;
      }
      mockResponse = `I'm here to help with coding, analysis, drafting, or any questions you have.

- **Status**: Running locally on your machine
- **Model**: ${selectedModel}
- **Data Privacy**: No data leaves this device

What would you like to work on next?`;
    }

    const tokens = mockResponse.split(/(?<=\s|```)/);
    let currentText = '';

    for (let i = 0; i < tokens.length; i++) {
      if (abortControllerRef.current?.signal.aborted) break;
      currentText += tokens[i];

      updateCurrentChatMessages(msgs => {
        const next = [...msgs];
        const lastIdx = next.findIndex(m => m.id === assistantPlaceholderId);
        if (lastIdx !== -1) {
          next[lastIdx] = {
            ...next[lastIdx],
            content: currentText,
            thinking: mockThinking || undefined,
            thinkingTime: isReasoning ? 2 : undefined
          };
        }
        return next;
      });

      await new Promise(r => setTimeout(r, 20));
    }

    const duration = (performance.now() - startTime) / 1000;
    const speed = duration > 0 ? Math.round((tokens.length / duration) * 10) / 10 : 34.2;

    updateCurrentChatMessages(msgs => {
      const next = [...msgs];
      const lastIdx = next.findIndex(m => m.id === assistantPlaceholderId);
      if (lastIdx !== -1) {
        next[lastIdx] = {
          ...next[lastIdx],
          tokensPerSec: speed
        };
      }
      return next;
    });

    setIsGenerating(false);
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
  };

  const handleRegenerate = () => {
    if (!currentChat || currentChat.messages.length < 2) return;
    const lastUserMsg = [...currentChat.messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content);
    }
  };

  const handleSpeakMessage = (msgId: string, text: string) => {
    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Strip markdown code fences for speech
    const cleanText = text.replace(/```[\s\S]*?```/g, 'Code block omitted.');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);
    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputPrompt(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 220)}px`;
  };

  // Group chats by date with Pinned chats section at top
  const groupedChats = React.useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const groups: { [key: string]: ChatSession[] } = {
      Pinned: [],
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      'Previous 30 Days': []
    };

    const filtered = chats
      .filter(c => !c.isTemporary)
      .filter(c => searchQuery ? c.title.toLowerCase().includes(searchQuery.toLowerCase()) : true);

    filtered.forEach(chat => {
      if (chat.pinned) {
        groups['Pinned'].push(chat);
        return;
      }
      const diff = now - chat.updatedAt;
      if (diff < oneDay) {
        groups['Today'].push(chat);
      } else if (diff < 2 * oneDay) {
        groups['Yesterday'].push(chat);
      } else if (diff < 7 * oneDay) {
        groups['Previous 7 Days'].push(chat);
      } else {
        groups['Previous 30 Days'].push(chat);
      }
    });

    return groups;
  }, [chats, searchQuery]);

  const hasMessages = currentChat?.messages && currentChat.messages.length > 0;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#ffffff] dark:bg-[#000000] text-[#0d0d0d] dark:text-[#ececec] font-sans antialiased select-none">
      
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* ============================================================ */}
      {/* SIDEBAR: Claw Tear Clean Sidebar                             */}
      {/* ============================================================ */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-40 md:z-30 h-full ${
          sidebarOpen ? 'w-[260px] translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 md:w-0'
        } flex-shrink-0 transition-all duration-200 ease-in-out flex flex-col bg-[#f9f9f9] dark:bg-[#121212] border-r border-[#e5e5e5] dark:border-[#212121] overflow-hidden select-none`}
      >
        <div className="w-[260px] h-full flex flex-col p-2.5">
          {/* Top Bar: Collapse Icon + Multi-Select Toggle + New Chat Icon */}
          <div className="flex items-center justify-between px-1.5 py-1 mb-2">
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg text-[#676767] dark:text-[#b4b4b4] hover:bg-[#ececec] dark:hover:bg-[#1e1e1e] hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              title="Close sidebar"
            >
              <PanelLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setIsSelectingChats(prev => {
                    const next = !prev;
                    if (!next) setSelectedChatIds([]);
                    return next;
                  });
                }}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  isSelectingChats
                    ? 'bg-black/10 dark:bg-white/10 text-black dark:text-white font-medium'
                    : 'text-[#676767] dark:text-[#b4b4b4] hover:bg-[#ececec] dark:hover:bg-[#1e1e1e] hover:text-black dark:hover:text-white'
                }`}
                title={isSelectingChats ? "Exit selection mode" : "Select multiple chats to delete"}
                aria-label="Select multiple chats"
              >
                <CheckSquare className="w-4 h-4" />
              </button>

              <button
                onClick={initNewChat}
                className="p-2 rounded-lg text-[#676767] dark:text-[#b4b4b4] hover:bg-[#ececec] dark:hover:bg-[#1e1e1e] hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                title="New chat"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Claw Tear Brand Header */}
          <div className="space-y-0.5 mb-3">
            <div
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#0d0d0d] dark:text-[#ececec] select-none"
            >
              <div className="w-6 h-6 rounded-full border border-black/10 dark:border-white/10 flex items-center justify-center bg-black dark:bg-white text-white dark:text-black shadow-xs">
                <ClawTearLogo className="w-3.5 h-3.5" />
              </div>
              <span className="truncate font-semibold">Claw Tear</span>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mb-2 px-1">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-2.5 text-[#9b9b9b]" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-8 pr-12 py-1.5 rounded-lg bg-[#f0f0f0] dark:bg-[#212121] border border-transparent focus:border-[#d0d0d0] dark:focus:border-[#383838] text-xs text-[#0d0d0d] dark:text-[#ececec] placeholder-[#8e8e8e] outline-none transition-all"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2 text-[#8e8e8e] hover:text-black dark:hover:text-white"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <span className="absolute right-2.5 top-2 text-[10px] font-mono text-[#8e8e8e]/70 px-1 py-0.2 rounded bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                ⌘K
              </span>
            )}
          </div>

          {/* Multi-Chat Selection Action Bar */}
          {isSelectingChats && (
            <div className="mx-1 mb-2 p-2.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 animate-in fade-in duration-150">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={handleSelectAllToggle}
                  className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:text-black dark:hover:text-white cursor-pointer select-none"
                >
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                    selectedChatIds.length > 0 && selectedChatIds.length === chats.filter(c => !c.isTemporary).length
                      ? 'bg-black dark:bg-white border-black dark:border-white text-white dark:text-black'
                      : 'border-neutral-400 dark:border-neutral-600 bg-transparent'
                  }`}>
                    {selectedChatIds.length > 0 && selectedChatIds.length === chats.filter(c => !c.isTemporary).length && (
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    )}
                  </div>
                  <span>
                    {selectedChatIds.length === chats.filter(c => !c.isTemporary).length && chats.filter(c => !c.isTemporary).length > 0
                      ? 'Deselect all'
                      : 'Select all'}
                  </span>
                </button>

                <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 font-medium text-neutral-600 dark:text-neutral-300">
                  {selectedChatIds.length} of {chats.filter(c => !c.isTemporary).length}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenBulkDelete}
                  disabled={selectedChatIds.length === 0}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    selectedChatIds.length > 0
                      ? 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90 shadow-xs'
                      : 'bg-black/5 dark:bg-white/5 text-[#8e8e8e] cursor-not-allowed opacity-50'
                  }`}
                  title={selectedChatIds.length === 0 ? "Select chats to delete" : `Delete ${selectedChatIds.length} selected chats`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete ({selectedChatIds.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSelectingChats(false);
                    setSelectedChatIds([]);
                  }}
                  className="py-1.5 px-2.5 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Chat history list */}
          <div className="flex-1 overflow-y-auto space-y-4 px-1 pr-1.5 scrollbar-thin">
            {Object.entries(groupedChats).map(([groupTitle, groupItems]) => {
              if (groupItems.length === 0) return null;
              return (
                <div key={groupTitle} className="space-y-0.5">
                  <div className="text-[11px] font-semibold text-[#8e8e8e] dark:text-[#737373] px-3 py-1 tracking-tight">
                    {groupTitle}
                  </div>
                  {groupItems.map(chat => {
                    const isActive = chat.id === currentChatId;
                    const isSelected = selectedChatIds.includes(chat.id);
                    return (
                      <div
                        key={chat.id}
                        onClick={() => {
                          if (isSelectingChats) {
                            toggleChatSelection(chat.id);
                            return;
                          }
                          if (temporaryChat) {
                            setTemporaryChat(false);
                            setTempChatSession(null);
                          }
                          setCurrentChatId(chat.id);
                          if (typeof window !== 'undefined' && window.innerWidth < 768) {
                            setSidebarOpen(false);
                          }
                        }}
                        className={`group relative flex items-center justify-between px-3 py-2 rounded-lg text-[13px] cursor-pointer transition-colors ${
                          isSelectingChats && isSelected
                            ? 'bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/15 text-black dark:text-white font-medium'
                            : isActive && !isSelectingChats
                            ? 'bg-[#ececec] dark:bg-[#212121] text-black dark:text-white font-medium'
                            : 'text-[#424242] dark:text-[#b4b4b4] hover:bg-[#ececec] dark:hover:bg-[#212121] hover:text-black dark:hover:text-white'
                        }`}
                      >
                        {/* Checkbox indicator in select mode */}
                        {isSelectingChats && (
                          <div
                            onClick={e => {
                              e.stopPropagation();
                              toggleChatSelection(chat.id);
                            }}
                            className="mr-2.5 flex-shrink-0"
                          >
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-black dark:bg-white border-black dark:border-white text-white dark:text-black shadow-xs'
                                  : 'border-neutral-400 dark:border-neutral-600 bg-white/5 hover:border-neutral-500'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                        )}

                        {editingChatId === chat.id ? (
                          <input
                            type="text"
                            value={editChatTitle}
                            onChange={e => setEditChatTitle(e.target.value)}
                            onBlur={() => saveRenameChat(chat.id)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveRenameChat(chat.id);
                              if (e.key === 'Escape') setEditingChatId(null);
                            }}
                            autoFocus
                            className="w-full bg-white dark:bg-[#2f2f2f] text-xs px-2 py-1 rounded border border-emerald-500 outline-none"
                          />
                        ) : (
                          <>
                            <span className="truncate flex-1 pr-2 flex items-center gap-1.5">
                              {chat.pinned && (
                                <Pin className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                              )}
                              <span className="truncate">{chat.title}</span>
                            </span>
                            
                            {/* Three dots button - hidden when selecting */}
                            {!isSelectingChats && (
                              <div className="relative">
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    setActiveMenuChatId(activeMenuChatId === chat.id ? null : chat.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-black dark:hover:text-white transition-opacity"
                                >
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </button>

                                {activeMenuChatId === chat.id && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-30"
                                      onClick={e => {
                                        e.stopPropagation();
                                        setActiveMenuChatId(null);
                                      }}
                                    />
                                    <div
                                      onClick={e => e.stopPropagation()}
                                      className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-white dark:bg-[#24283b] border border-[#e5e5e5] dark:border-[#383838] shadow-xl py-1 z-40 animate-in fade-in duration-100 text-xs text-[#424242] dark:text-[#ececec]"
                                    >
                                      <button
                                        onClick={e => handleTogglePinChat(e, chat.id)}
                                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors cursor-pointer"
                                      >
                                        {chat.pinned ? (
                                          <>
                                            <PinOff className="w-3.5 h-3.5 text-[#8e8e8e]" />
                                            <span>Unpin chat</span>
                                          </>
                                        ) : (
                                          <>
                                            <Pin className="w-3.5 h-3.5 text-[#8e8e8e]" />
                                            <span>Pin to top</span>
                                          </>
                                        )}
                                      </button>
                                      <button
                                        onClick={e => handleExportChat(e, chat.id, 'md')}
                                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors cursor-pointer"
                                      >
                                        <Download className="w-3.5 h-3.5 text-[#8e8e8e]" />
                                        <span>Export Markdown</span>
                                      </button>
                                      <button
                                        onClick={e => handleExportChat(e, chat.id, 'json')}
                                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors cursor-pointer"
                                      >
                                        <FileCode className="w-3.5 h-3.5 text-[#8e8e8e]" />
                                        <span>Export JSON</span>
                                      </button>
                                      <button
                                        onClick={e => startRenameChat(e, chat)}
                                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-[#f5f5f5] dark:hover:bg-white/5 transition-colors cursor-pointer"
                                      >
                                        <Pencil className="w-3.5 h-3.5 text-[#8e8e8e]" />
                                        <span>Rename</span>
                                      </button>
                                      <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          setActiveMenuChatId(null);
                                          setSelectedChatIds([chat.id]);
                                          setShowBulkDeleteModal(true);
                                        }}
                                        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-neutral-700 dark:text-neutral-300"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete</span>
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Settings & Contributor Credits Footer */}
          <div className="pt-2 border-t border-[#e5e5e5] dark:border-[#2f2f2f] space-y-1.5">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-[#ececec] dark:hover:bg-[#212121] transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
                  <SettingsIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-black dark:text-white">
                    Settings
                  </div>
                  <div className="text-[11px] text-[#8e8e8e] dark:text-[#737373]">
                    {ollamaConnected ? 'Ollama Connected' : 'Local Sandbox'}
                  </div>
                </div>
              </div>
            </button>

            {/* Contributor Credits Section */}
            <div className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
              <span className="text-[11px] font-medium text-[#676767] dark:text-[#a0a0a0]">
                Contributor Credits
              </span>
              <div className="flex items-center gap-1">
                <a
                  href="https://www.linkedin.com/in/sivaji-rayapati-levi/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-[#676767] dark:text-[#a0a0a0] hover:text-[#0077b5] dark:hover:text-[#38bdf8] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title="LinkedIn: Sivaji Rayapati"
                  aria-label="LinkedIn Profile"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
                <a
                  href="https://github.com/Shivajirayapati?tab=overview&from=2026-09-01&to=2026-09-27"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-[#676767] dark:text-[#a0a0a0] hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title="GitHub: Shivajirayapati"
                  aria-label="GitHub Profile"
                >
                  <Github className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* MAIN VIEW: Claw Tear Dark Canvas                             */}
      {/* ============================================================ */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#000000] relative">
        
        {/* TOP HEADER: Sidebar Toggle, Model Selector, Mode Pills, Actions */}
        <header className="h-14 px-4 flex items-center justify-between flex-shrink-0 z-20">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg text-[#676767] dark:text-[#b4b4b4] hover:bg-[#f0f0f0] dark:hover:bg-[#1e1e1e] hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                title="Open sidebar"
              >
                <PanelLeft className="w-5 h-5" />
              </button>
            )}

            {/* Model Selector Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowModelMenu(!showModelMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-[#f0f0f0] dark:hover:bg-[#1e1e1e] transition-colors cursor-pointer text-base font-semibold text-[#0d0d0d] dark:text-[#ececec]"
              >
                <span>{selectedModel}</span>
                {temporaryChat && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-normal border border-amber-500/20">
                    Temporary
                  </span>
                )}
                <ChevronDown className="w-4 h-4 text-[#8e8e8e]" />
              </button>

              {showModelMenu && (
                <div className="absolute left-0 top-full mt-1.5 w-[calc(100vw-2.5rem)] max-w-xs sm:w-84 max-h-[75vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#1e1e1e] border border-[#e5e5e5] dark:border-[#333333] shadow-2xl p-2 z-40 animate-in fade-in duration-100">
                  {/* Downloaded Ollama Models section */}
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8e8e8e] flex items-center justify-between">
                    <span>Local Models ({installedOllamaModels.length})</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        checkOllama();
                      }}
                      className="text-[10px] text-sky-500 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <RotateCw className="w-2.5 h-2.5" />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {installedOllamaModels.length > 0 ? (
                    <div className="space-y-1 mb-2">
                      {installedOllamaModels.map(m => (
                        <button
                          key={m.name}
                          type="button"
                          onClick={() => {
                            setSelectedModel(m.name);
                            setShowModelMenu(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl flex items-start justify-between cursor-pointer transition-colors ${
                            selectedModel === m.name
                              ? 'bg-[#f4f4f4] dark:bg-[#2d2d2d]'
                              : 'hover:bg-[#f0f0f0] dark:hover:bg-[#252525]'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-xs text-[#0d0d0d] dark:text-white truncate">
                                {m.name}
                              </span>
                              {m.details?.parameter_size && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-300 font-mono font-medium">
                                  {m.details.parameter_size}
                                </span>
                              )}
                              {m.size ? (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                                  {formatBytes(m.size)}
                                </span>
                              ) : null}
                            </div>
                            <div className="text-[11px] text-[#8e8e8e] dark:text-[#a0a0a0] mt-0.5">
                              {m.details?.family || 'local'} • {m.details?.quantization_level || 'GGUF'}
                            </div>
                          </div>
                          {selectedModel === m.name && (
                            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-2.5 text-xs text-[#8e8e8e] dark:text-[#a0a0a0] bg-black/5 dark:bg-white/5 rounded-xl mb-2">
                      <div className="font-medium text-[#0d0d0d] dark:text-[#ececec]">
                        {ollamaConnected ? 'Ollama online (no models yet)' : 'Local Ollama not detected'}
                      </div>
                      <div className="text-[11px] mt-1 text-[#676767] dark:text-[#a0a0a0]">
                        {ollamaConnected
                          ? 'Run in terminal: ollama run qwen3:4b'
                          : 'Run Ollama locally on your computer at http://127.0.0.1:11434'}
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/10 flex flex-wrap gap-1.5">
                        {['qwen3:4b', 'llama3.2:1b', 'deepseek-r1:1.5b'].map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              setSelectedModel(tag);
                              setShowModelMenu(false);
                            }}
                            className={`px-2 py-1 rounded-md text-[11px] font-mono transition-colors ${
                              selectedModel === tag
                                ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
                                : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[#0d0d0d] dark:text-[#ececec]'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Temporary chat section */}
                  <div className="mt-2 pt-2 border-t border-[#e5e5e5] dark:border-[#333333] px-3 py-1.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[#0d0d0d] dark:text-white">
                        Temporary chat
                      </div>
                      <div className="text-[11px] text-[#8e8e8e]">
                        Won&apos;t appear in history
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleTemporaryChat()}
                      className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                        temporaryChat ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                          temporaryChat ? 'right-0.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Header Controls: Clean & minimal modern layout */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* New Chat Button */}
            <button
              onClick={initNewChat}
              className="p-2 rounded-xl text-[#676767] dark:text-[#b4b4b4] hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="New Chat (⌘N)"
              aria-label="New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Keyboard Shortcuts Trigger */}
            <button
              onClick={() => setShowShortcutsModal(true)}
              className="hidden sm:flex p-2 rounded-xl text-[#676767] dark:text-[#b4b4b4] hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Keyboard Shortcuts (⌘/)"
              aria-label="Keyboard Shortcuts"
            >
              <Keyboard className="w-4 h-4" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-[#676767] dark:text-[#b4b4b4] hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 border border-black/5 dark:border-white/5 transition-colors cursor-pointer"
              title={
                settings.theme === 'tokyo-night'
                  ? 'Tokyo Night (VS Code) — Click for Light Mode'
                  : settings.theme === 'dark'
                  ? 'Dark Mode — Click for Tokyo Night'
                  : 'Light Mode — Click for Dark Mode'
              }
            >
              {settings.theme === 'tokyo-night' ? (
                <Sparkles className="w-4 h-4 text-[#7aa2f7]" />
              ) : settings.theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* Settings Trigger */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-xl text-[#676767] dark:text-[#b4b4b4] hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Settings"
              aria-label="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Temporary Chat Notice Banner */}
        {temporaryChat && (
          <div className="w-full bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 z-10 animate-in fade-in duration-150 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
              <span className="font-semibold">Temporary Chat</span>
              <span className="text-amber-800/80 dark:text-amber-300/80 hidden sm:inline">
                — Messages won&apos;t be saved to history and will be discarded when you exit.
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleToggleTemporaryChat(false)}
              className="px-2.5 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-100 font-medium transition-colors cursor-pointer text-[11px]"
            >
              Exit temporary chat
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* CENTER CONTENT: Empty Greeting OR Message Scroll View        */}
        {/* ============================================================ */}
        {!hasMessages ? (
          /* ============================================================ */
          /* EMPTY STATE: High-craft Studio Workstation                   */
          /* ============================================================ */
          <div className="flex-1 flex flex-col items-center justify-between px-4 pb-4 max-w-3xl mx-auto w-full pt-10 sm:pt-14 overflow-y-auto scrollbar-thin">
            <div className="w-full flex flex-col items-center">
              
              {/* Emblem & Ambient Glow */}
              <div className="relative mb-4 flex items-center justify-center">
                <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-sky-500/15 via-indigo-500/10 to-purple-500/15 blur-xl pointer-events-none" />
                <div className="relative w-12 h-12 rounded-2xl bg-black dark:bg-white text-white dark:text-black border border-black/10 dark:border-white/10 flex items-center justify-center shadow-lg">
                  <ClawTearLogo className="w-6 h-6" />
                </div>
              </div>

              {/* Title with Balanced Wrap */}
              <h1 className="text-2xl sm:text-4xl font-semibold text-[#0d0d0d] dark:text-white tracking-tight mb-2.5 text-center [text-wrap:balance]">
                Where should we begin?
              </h1>

              {/* Unboxed Metadata Strip (Zero-Pill Compliance) */}
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[#737373] dark:text-[#a0a0a0] mb-6 font-medium">
                <span>Local Intelligence</span>
                <span aria-hidden="true" className="text-black/20 dark:text-white/20">·</span>
                <span>Zero Telemetry</span>
                <span aria-hidden="true" className="text-black/20 dark:text-white/20">·</span>
                <span>Offline First</span>
                <span aria-hidden="true" className="text-black/20 dark:text-white/20">·</span>
                <span className={`inline-flex items-center gap-1 font-mono text-[11px] ${
                  ollamaConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-600 dark:text-sky-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    ollamaConnected ? 'bg-emerald-500 animate-pulse' : 'bg-sky-400'
                  }`} />
                  {ollamaConnected ? 'Ollama Online' : 'Sandbox Ready'}
                </span>
              </div>

              {/* File Upload Error/Notice Banner */}
              {fileUploadError && (
                <div className="w-full mb-3 flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span>{fileUploadError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFileUploadError(null)}
                    className="text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-100 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Centered Composer Box: High-Craft Auto-expanding Capsule */}
              <div
                className={`w-full mb-8 transition-all ${
                  isDraggingFile ? 'scale-[1.01]' : ''
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className={`prompt-box-capsule relative rounded-[26px] bg-[#f4f4f4] dark:bg-[#212121] border transition-all p-3 pl-4 pb-2.5 shadow-md ${
                  isDraggingFile
                    ? 'border-dashed border-sky-500 ring-2 ring-sky-500/20 bg-sky-500/5'
                    : 'border-black/5 dark:border-white/10 focus-within:border-black/20 dark:focus-within:border-white/20'
                }`}>
                  {/* Hidden file input restricted strictly to text, code, and documents (no media) */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".txt,.py,.java,.c,.cpp,.h,.hpp,.html,.css,.js,.ts,.tsx,.jsx,.json,.md,.csv,.sql,.xml,.yaml,.yml,.sh,.bat,.rs,.go,.php,.rb,.swift,.kt,.cs,.pdf,.doc,.docx"
                    multiple
                  />

                  {/* Attachment chips if any */}
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-black/5 dark:border-white/10">
                      {attachments.map((att, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-[#2d2d2d] text-xs font-mono border border-black/5 dark:border-white/10"
                        >
                          <Paperclip className="w-3 h-3 text-emerald-500" />
                          <span className="truncate max-w-[140px]">{att.name}</span>
                          <span className="text-[10px] text-neutral-400">({formatBytes(att.size)})</span>
                          <button
                            type="button"
                            onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                            className="text-[#8e8e8e] hover:text-black dark:hover:text-white cursor-pointer ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Multi-line auto-expanding textarea */}
                  <textarea
                    ref={emptyTextareaRef}
                    value={inputPrompt}
                    onChange={e => {
                      setInputPrompt(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 220)}px`;
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask anything or propose a task..."
                    rows={1}
                    className="w-full bg-transparent outline-none resize-none text-[15.5px] sm:text-[16px] text-[#0d0d0d] dark:text-[#ececec] placeholder-[#8e8e8e] leading-relaxed max-h-48"
                  />

                  {/* Composer Controls Row */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                      {/* Attach File Button (Code & Documents Only) */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 sm:p-2 rounded-lg text-[#8e8e8e] hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                        title="Attach code or document files (No images or videos)"
                        aria-label="Attach code or document files"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>

                      {/* Deep Think Mode Toggle */}
                      <button
                        type="button"
                        onClick={() => setReasonActive(r => !r)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          reasonActive
                            ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                            : 'text-[#8e8e8e] hover:text-[#0d0d0d] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                        }`}
                        title={reasonActive ? "Deep reasoning enabled (thought process will be shown)" : "Enable deep reasoning mode"}
                      >
                        <Lightbulb className={`w-3.5 h-3.5 ${reasonActive ? 'text-purple-500' : ''}`} />
                        <span>Deep Think</span>
                      </button>

                      {/* Web Search Toggle */}
                      <button
                        type="button"
                        onClick={() => setWebSearchActive(w => !w)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          webSearchActive
                            ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                            : 'text-[#8e8e8e] hover:text-[#0d0d0d] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                        }`}
                        title={webSearchActive ? "Web search grounding enabled" : "Enable web search"}
                      >
                        <Globe className={`w-3.5 h-3.5 ${webSearchActive ? 'text-sky-500' : ''}`} />
                        <span>Search</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline text-[11px] text-[#8e8e8e]/70 font-mono select-none">
                        ↵ send · ⇧↵ line
                      </span>

                      {/* Send Arrow Button */}
                      <button
                        type="button"
                        onClick={() => handleSendMessage()}
                        disabled={!inputPrompt.trim() && attachments.length === 0}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs flex-shrink-0 active:scale-95 ${
                          inputPrompt.trim() || attachments.length > 0
                            ? 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90'
                            : 'bg-[#e5e5e5] dark:bg-[#383838] text-[#9b9b9b] dark:text-[#676767] cursor-not-allowed opacity-60'
                        }`}
                        title="Send message"
                        aria-label="Send message"
                      >
                        <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer: Disclaimer & Contributor Credits */}
            <div className="w-full mt-auto pt-6 pb-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-center text-[11.5px] text-[#8e8e8e] border-t border-black/5 dark:border-white/5">
              <span>Claw Tear · On-device Intelligence · Zero telemetry</span>
              <div className="flex items-center gap-1.5">
                <span>Created by</span>
                <a
                  href="https://www.linkedin.com/in/sivaji-rayapati-levi/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[#676767] dark:text-[#a0a0a0] hover:text-[#0077b5] dark:hover:text-[#38bdf8] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title="LinkedIn: Sivaji Rayapati"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium">Sivaji Rayapati</span>
                </a>
                <a
                  href="https://github.com/Shivajirayapati?tab=overview&from=2026-09-01&to=2026-09-27"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[#676767] dark:text-[#a0a0a0] hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title="GitHub: Shivajirayapati"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium">GitHub</span>
                </a>
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* ACTIVE CHAT: Message Stream                                  */
          /* ============================================================ */
          <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
            <div className="max-w-3xl mx-auto space-y-6">
              {currentChat?.messages?.map((msg, msgIdx) => {
                const isLastMessage = msgIdx === (currentChat?.messages?.length ?? 0) - 1;
                const isThisActive = isGenerating && isLastMessage && msg.role === 'assistant';
                const isThinking = isThisActive && !msg.content;

                return (
                  <div key={msg.id} className="select-text group">
                    {msg.role === 'user' ? (
                      /* User Message (Rounded bubble on right with inline edit) */
                      <div className="flex justify-end items-end gap-2 group/user">
                        {editingUserMsgId === msg.id ? (
                          <div className="w-full max-w-[85%] bg-[#f4f4f4] dark:bg-[#24283b] p-3 rounded-2xl border border-black/10 dark:border-white/10 space-y-2">
                            <textarea
                              value={editingUserMsgText}
                              onChange={e => setEditingUserMsgText(e.target.value)}
                              rows={3}
                              className="w-full bg-white dark:bg-[#1a1b26] p-2.5 rounded-xl border border-black/10 dark:border-white/10 text-sm text-[#0d0d0d] dark:text-[#ececec] outline-none resize-none font-sans"
                              autoFocus
                            />
                            <div className="flex items-center justify-end gap-2 text-xs">
                              <button
                                type="button"
                                onClick={() => setEditingUserMsgId(null)}
                                className="px-3 py-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!currentChat || !editingUserMsgText.trim()) return;
                                  const idx = currentChat.messages.findIndex(m => m.id === msg.id);
                                  if (idx === -1) return;
                                  const trimmed = currentChat.messages.slice(0, idx);
                                  const editedUserMsg: Message = {
                                    ...msg,
                                    content: editingUserMsgText.trim(),
                                    timestamp: Date.now()
                                  };
                                  updateCurrentChatMessages(() => [...trimmed, editedUserMsg]);
                                  setEditingUserMsgId(null);
                                  handleSendMessage(editedUserMsg.content);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black font-medium transition-colors cursor-pointer"
                              >
                                Save & Submit
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 max-w-[85%]">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUserMsgId(msg.id);
                                setEditingUserMsgText(msg.content);
                              }}
                              className="opacity-0 group-hover/user:opacity-100 p-1.5 rounded-lg text-[#8e8e8e] hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-opacity cursor-pointer"
                              title="Edit message"
                              aria-label="Edit message"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <div className="bg-[#f4f4f4] dark:bg-[#212121] px-5 py-3.5 rounded-[24px] rounded-br-[6px] text-[15px] sm:text-[15.5px] text-[#0d0d0d] dark:text-[#ececec] leading-relaxed space-y-2 border border-black/5 dark:border-white/5 shadow-xs">
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pb-1">
                                  {msg.attachments.map((att, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white dark:bg-[#1a1a1a] text-xs font-mono border border-black/5 dark:border-white/10"
                                    >
                                      <Paperclip className="w-3 h-3 text-emerald-500" />
                                      <span>{att.name}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="whitespace-pre-wrap">{msg.content}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Assistant Message with animated responding/thinking AI logo */
                      <div className="flex gap-4 items-start w-full">
                        {/* Claw Tear Avatar Icon with thinking / generating animation */}
                        <div className="relative flex items-center justify-center flex-shrink-0 mt-1">
                          {/* Animated glowing breathing halo when generating */}
                          {isThisActive && (
                            <>
                              <span className="absolute -inset-1 rounded-full bg-gradient-to-tr from-sky-400 via-indigo-500 to-purple-500 opacity-75 blur-xs animate-pulse" />
                              <span className="absolute -inset-2 rounded-full border border-sky-400/40 animate-ping opacity-35 pointer-events-none" />
                            </>
                          )}
                          <div
                            className={`relative w-7 h-7 rounded-full border transition-all duration-300 flex items-center justify-center shadow-xs ${
                              isThisActive
                                ? 'border-sky-400/70 bg-gradient-to-tr from-sky-600 to-indigo-600 text-white scale-105 shadow-md shadow-sky-500/25'
                                : 'border-black/10 dark:border-white/10 bg-black dark:bg-white text-white dark:text-black'
                            }`}
                          >
                            <ClawTearLogo
                              className={`w-4 h-4 transition-transform duration-500 ${
                                isThisActive ? 'animate-[spin_4s_linear_infinite]' : ''
                              }`}
                            />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 space-y-3">
                          {/* Collapsible Reasoning Block (ChatGPT o1 style) */}
                          {msg.thinking && (
                            <div className="mb-2">
                              <button
                                onClick={() =>
                                  setExpandedReasoningMap(prev => ({
                                    ...prev,
                                    [msg.id]: !prev[msg.id]
                                  }))
                                }
                                className="inline-flex items-center gap-1.5 text-xs text-[#8e8e8e] dark:text-[#8e8e8e] hover:text-black dark:hover:text-white font-medium transition-colors cursor-pointer py-1"
                              >
                                <Lightbulb className={`w-3.5 h-3.5 text-purple-500 dark:text-purple-400 ${isThisActive ? 'animate-pulse' : ''}`} />
                                <span className="tabular-nums">
                                  {isThisActive && !msg.content
                                    ? 'Thinking...'
                                    : `Thought for ${msg.thinkingTime || 2}s`}
                                </span>
                                <ChevronRight
                                  className={`w-3.5 h-3.5 transition-transform ${
                                    expandedReasoningMap[msg.id] ? 'rotate-90' : ''
                                  }`}
                                />
                              </button>

                              {expandedReasoningMap[msg.id] && (
                                <div className="p-3.5 rounded-xl bg-[#f7f7f7] dark:bg-[#1a1a1c] border border-black/5 dark:border-white/5 font-mono text-xs text-[#676767] dark:text-[#a0a0a0] leading-relaxed whitespace-pre-wrap my-2 animate-in fade-in duration-100">
                                  {msg.thinking}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Active thinking indicator when waiting for initial tokens */}
                          {isThinking && !msg.thinking && (
                            <div className="flex items-center gap-2 py-1 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce [animation-delay:-0.3s]" />
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" />
                              </span>
                              <span className="animate-pulse">Thinking...</span>
                            </div>
                          )}

                          {/* Rendered Markdown Body */}
                          {msg.content ? (
                            <div className="text-[#0d0d0d] dark:text-[#ececec]">
                              <MarkdownRenderer content={msg.content} />
                            </div>
                          ) : null}

                        {/* ChatGPT Action Toolbar (Copy, Branch/Fork, ThumbsUp, ThumbsDown, Read Aloud, Regenerate) */}
                        <div className="flex items-center gap-1 pt-2 text-[#8e8e8e] flex-wrap">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(msg.content);
                              setCopiedMsgId(msg.id);
                              setTimeout(() => setCopiedMsgId(null), 2000);
                            }}
                            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                            title="Copy response"
                          >
                            {copiedMsgId === msg.id ? (
                              <Check className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={() => handleForkChat(msg.id)}
                            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                            title="Branch conversation from this message"
                          >
                            <GitFork className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() =>
                              setLikedMap(prev => ({
                                ...prev,
                                [msg.id]: prev[msg.id] === 'liked' ? null : 'liked'
                              }))
                            }
                            className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                              likedMap[msg.id] === 'liked' ? 'text-emerald-500' : 'hover:text-black dark:hover:text-white'
                            }`}
                            title="Good response"
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() =>
                              setLikedMap(prev => ({
                                ...prev,
                                [msg.id]: prev[msg.id] === 'disliked' ? null : 'disliked'
                              }))
                            }
                            className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                              likedMap[msg.id] === 'disliked' ? 'text-red-500' : 'hover:text-black dark:hover:text-white'
                            }`}
                            title="Bad response"
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleSpeakMessage(msg.id, msg.content)}
                            className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                              speakingMsgId === msg.id ? 'text-emerald-500 animate-pulse' : 'hover:text-black dark:hover:text-white'
                            }`}
                            title={speakingMsgId === msg.id ? 'Stop reading' : 'Read aloud'}
                          >
                            {speakingMsgId === msg.id ? (
                              <VolumeX className="w-4 h-4" />
                            ) : (
                              <Volume2 className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={handleRegenerate}
                            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                            title="Regenerate"
                          >
                            <RotateCw className="w-4 h-4" />
                          </button>

                          {/* Download Generated Code as File */}
                          {msg.content && (
                            <button
                              onClick={() => handleDownloadCodeFromMessage(msg.content, msg.id)}
                              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                              title="Download code as file"
                            >
                              {downloadedMsgId === msg.id ? (
                                <Check className="w-4 h-4 text-sky-500 stroke-[2.5]" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {msg.tokensPerSec ? (
                            <span className="text-[11px] font-mono tabular-nums text-[#8e8e8e] ml-2 select-none">
                              {msg.tokensPerSec} tok/s
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* BOTTOM COMPOSER: When messages exist                         */}
        {/* ============================================================ */}
        {hasMessages && (
          <div className={`composer-bottom-gradient p-4 pt-2 bg-gradient-to-t from-white via-white to-transparent ${
            settings.theme === 'tokyo-night'
              ? 'from-[#1a1b26] via-[#1a1b26] to-transparent'
              : 'dark:from-[#000000] dark:via-[#000000] dark:to-transparent'
          } z-10`}>
            <div className="max-w-3xl mx-auto">
              {/* File Upload Error/Notice Banner in Active Chat */}
              {fileUploadError && (
                <div className="w-full mb-2 flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span>{fileUploadError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFileUploadError(null)}
                    className="text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-100 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div
                className={`prompt-box-capsule relative rounded-[26px] bg-[#f4f4f4] dark:bg-[#212121] border transition-all p-3 pl-4 pb-2.5 shadow-lg ${
                  isDraggingFile
                    ? 'border-dashed border-sky-500 ring-2 ring-sky-500/20 bg-sky-500/5'
                    : 'border-black/5 dark:border-white/10 focus-within:border-black/20 dark:focus-within:border-white/20'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {/* Attachments pills */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-black/5 dark:border-white/10">
                    {attachments.map((att, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-[#2d2d2d] text-xs font-mono border border-black/5 dark:border-white/10"
                      >
                        <Paperclip className="w-3 h-3 text-emerald-500" />
                        <span className="truncate max-w-[140px]">{att.name}</span>
                        <span className="text-[10px] text-neutral-400">({formatBytes(att.size)})</span>
                        <button
                          type="button"
                          onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                          className="text-[#8e8e8e] hover:text-black dark:hover:text-white cursor-pointer ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  value={inputPrompt}
                  onChange={handleInputResize}
                  onKeyDown={handleTextareaKeyDown}
                  placeholder="Message Claw Tear..."
                  rows={1}
                  className="w-full bg-transparent outline-none resize-none text-[15.5px] sm:text-[16px] text-[#0d0d0d] dark:text-[#ececec] placeholder-[#8e8e8e] leading-relaxed max-h-48"
                />

                {/* Bottom row inside capsule */}
                <div className="flex items-center justify-between pt-1.5 sm:pt-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".txt,.py,.java,.c,.cpp,.h,.hpp,.html,.css,.js,.ts,.tsx,.jsx,.json,.md,.csv,.sql,.xml,.yaml,.yml,.sh,.bat,.rs,.go,.php,.rb,.swift,.kt,.cs,.pdf,.doc,.docx"
                    multiple
                  />

                  <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                    {/* Attach File Button (Code & Documents Only) */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 sm:p-2 rounded-lg text-[#8e8e8e] hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                      title="Attach code or document files (No images or videos)"
                      aria-label="Attach code or document files"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    {/* Deep Think Mode Toggle */}
                    <button
                      type="button"
                      onClick={() => setReasonActive(r => !r)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        reasonActive
                          ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                          : 'text-[#8e8e8e] hover:text-[#0d0d0d] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                      }`}
                      title={reasonActive ? "Deep reasoning enabled (thought process will be shown)" : "Enable deep reasoning mode"}
                    >
                      <Lightbulb className={`w-3.5 h-3.5 ${reasonActive ? 'text-purple-500' : ''}`} />
                      <span>Deep Think</span>
                    </button>

                    {/* Web Search Toggle */}
                    <button
                      type="button"
                      onClick={() => setWebSearchActive(w => !w)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        webSearchActive
                          ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                          : 'text-[#8e8e8e] hover:text-[#0d0d0d] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                      }`}
                      title={webSearchActive ? "Web search grounding enabled" : "Enable web search"}
                    >
                      <Globe className={`w-3.5 h-3.5 ${webSearchActive ? 'text-sky-500' : ''}`} />
                      <span>Search</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline text-[11px] text-[#8e8e8e]/70 font-mono select-none">
                      ↵ send · ⇧↵ line
                    </span>

                    {isGenerating ? (
                      <button
                        onClick={handleStopGeneration}
                        className="w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center cursor-pointer shadow-xs hover:opacity-90"
                        title="Stop generating"
                      >
                        <Square className="w-3 h-3 fill-current" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSendMessage()}
                        disabled={!inputPrompt.trim() && attachments.length === 0}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                          inputPrompt.trim() || attachments.length > 0
                            ? 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90'
                            : 'bg-[#e5e5e5] dark:bg-[#383838] text-[#9b9b9b] dark:text-[#676767] cursor-not-allowed opacity-60'
                        }`}
                        title="Send message"
                      >
                        <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-2 text-center text-[11.5px] text-[#8e8e8e]">
                <span>Claw Tear can make mistakes. Check important info.</span>
                <span className="hidden sm:inline text-[#8e8e8e]/40">•</span>
                <div className="flex items-center gap-1.5">
                  <span>Credits:</span>
                  <a
                    href="https://www.linkedin.com/in/sivaji-rayapati-levi/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[#676767] dark:text-[#a0a0a0] hover:text-[#0077b5] dark:hover:text-[#38bdf8] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    title="LinkedIn: Sivaji Rayapati"
                  >
                    <Linkedin className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">LinkedIn</span>
                  </a>
                  <a
                    href="https://github.com/Shivajirayapati?tab=overview&from=2026-09-01&to=2026-09-27"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[#676767] dark:text-[#a0a0a0] hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    title="GitHub: Shivajirayapati"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">GitHub</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* 4. MODALS: Settings                                          */}
      {/* ============================================================ */}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-3xl bg-white dark:bg-[#212121] rounded-2xl shadow-2xl border border-[#e5e5e5] dark:border-[#383838] overflow-hidden text-[#0d0d0d] dark:text-[#ececec] flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-3.5 border-b border-[#e5e5e5] dark:border-[#383838] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <h2 className="text-base font-semibold truncate">Settings</h2>
                {resetFeedbackMsg && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full animate-in fade-in duration-150">
                    <Check className="w-3 h-3" />
                    <span>Defaults restored</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (!confirmResetAll) {
                      setConfirmResetAll(true);
                      setTimeout(() => setConfirmResetAll(false), 4500);
                    } else {
                      handleResetAllSettings();
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                    confirmResetAll
                      ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 font-semibold shadow-xs'
                      : 'border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-neutral-600 dark:text-neutral-400'
                  }`}
                  title="Reset all settings to default values"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${confirmResetAll ? 'rotate-180 transition-transform duration-300' : ''}`} />
                  <span>{confirmResetAll ? 'Click to confirm reset' : 'Reset to Defaults'}</span>
                </button>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-1 rounded-lg text-[#8e8e8e] hover:text-black dark:hover:text-white cursor-pointer"
                  title="Close settings"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Left Tab Sidebar + Right Details */}
            <div className="flex flex-col sm:flex-row h-[75vh] sm:h-[480px] overflow-hidden">
              {/* Left Tab List */}
              <div className="w-full sm:w-52 border-b sm:border-b-0 sm:border-r border-[#e5e5e5] dark:border-[#383838] p-2 sm:p-3 flex sm:flex-col justify-between overflow-x-auto sm:overflow-x-visible bg-[#f9f9f9] dark:bg-[#171717] flex-shrink-0">
                <div className="flex sm:flex-col gap-1 w-full">
                  {[
                    { id: 'general', label: 'General', icon: Sliders },
                    { id: 'model', label: 'Model Parameters', icon: Cpu },
                    { id: 'personalization', label: 'Personalization', icon: Sparkles },
                    { id: 'speech', label: 'Speech', icon: Volume2 },
                    { id: 'data', label: 'Data controls', icon: FolderArchive },
                    { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard }
                  ].map(tab => {
                    const TabIcon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setSettingsTab(tab.id as any)}
                        className={`whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left flex items-center gap-2 ${
                          settingsTab === tab.id
                            ? 'bg-[#ececec] dark:bg-[#282828] text-black dark:text-white font-semibold shadow-xs'
                            : 'text-[#676767] dark:text-[#a0a0a0] hover:bg-[#ececec] dark:hover:bg-[#212121] hover:text-black dark:hover:text-white'
                        }`}
                      >
                        <TabIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Reset to Defaults button at bottom of sidebar on desktop */}
                <div className="hidden sm:block pt-3 border-t border-[#e5e5e5] dark:border-[#383838] mt-auto">
                  <button
                    type="button"
                    onClick={() => {
                      if (!confirmResetAll) {
                        setConfirmResetAll(true);
                        setTimeout(() => setConfirmResetAll(false), 4500);
                      } else {
                        handleResetAllSettings();
                      }
                    }}
                    className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                      confirmResetAll
                        ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 font-semibold'
                        : 'text-[#676767] dark:text-[#a0a0a0] hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                    title="Reset all settings to default values"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 flex-shrink-0 ${confirmResetAll ? 'rotate-180 transition-transform duration-300' : ''}`} />
                    <span className="truncate">{confirmResetAll ? 'Confirm Reset All' : 'Reset to Defaults'}</span>
                  </button>
                </div>
              </div>

              {/* Right Tab Content */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 text-sm">
                {settingsTab === 'general' && (
                  <div className="space-y-5">
                    {/* Theme Selector */}
                    <div>
                      <div className="font-semibold text-xs mb-1 text-[#0d0d0d] dark:text-[#ececec]">Theme</div>
                      <div className="text-[11.5px] text-[#8e8e8e] mb-2.5">Choose interface appearance</div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5">
                        {[
                          { id: 'tokyo-night', label: 'Tokyo Night' },
                          { id: 'dark', label: 'Dark' },
                          { id: 'light', label: 'Light' },
                          { id: 'system', label: 'System' }
                        ].map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setSettings(s => ({ ...s, theme: t.id as any }));
                              localStorage.setItem('clawtear_theme', t.id);
                            }}
                            className={`py-2 px-3 rounded-lg text-xs font-medium transition-all text-center cursor-pointer ${
                              settings.theme === t.id
                                ? 'bg-white dark:bg-[#282828] text-black dark:text-white shadow-xs font-semibold'
                                : 'text-neutral-500 hover:text-black dark:hover:text-white'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Ollama Local Address */}
                    <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-xs text-[#0d0d0d] dark:text-[#ececec]">Ollama Local Address</div>
                        <div className="text-[11.5px] text-[#8e8e8e]">Default endpoint: http://127.0.0.1:11434</div>
                      </div>
                      <input
                        type="text"
                        value={settings.ollamaUrl}
                        onChange={e => setSettings(s => ({ ...s, ollamaUrl: e.target.value }))}
                        className="w-48 px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#242424] font-mono text-xs outline-none text-[#0d0d0d] dark:text-[#ececec] focus:border-black/30 dark:focus:border-white/30"
                      />
                    </div>

                    {/* Quick navigation to Model Parameters */}
                    <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-xs text-[#0d0d0d] dark:text-[#ececec]">Model Output & Generation Controls</div>
                        <div className="text-[11.5px] text-[#8e8e8e]">Control output token limits, temperature, context memory & sampling</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettingsTab('model')}
                        className="px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-colors"
                      >
                        <Cpu className="w-3.5 h-3.5" />
                        <span>Configure</span>
                      </button>
                    </div>

                    {/* Installed Local Models */}
                    <div className="pt-3 border-t border-black/5 dark:border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-[#0d0d0d] dark:text-[#ececec]">Installed Local Models</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-neutral-600 dark:text-neutral-300">
                            {installedOllamaModels.length}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={checkOllama}
                          className="px-2.5 py-1 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-colors"
                        >
                          <RotateCw className="w-3 h-3" />
                          <span>Refresh</span>
                        </button>
                      </div>

                      {installedOllamaModels.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                          {installedOllamaModels.map(m => (
                            <span
                              key={m.name}
                              className="text-[11px] px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 font-mono text-neutral-800 dark:text-neutral-200"
                            >
                              {m.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-[#8e8e8e] bg-black/5 dark:bg-white/5 p-3 rounded-xl leading-relaxed">
                          No models detected yet. Pull a model via your terminal:
                          <code className="block mt-1 font-mono text-neutral-900 dark:text-neutral-100 font-semibold text-[11px]">
                            ollama run qwen2.5:1.5b
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Model Settings & Output Range Controls */}
                {settingsTab === 'model' && (
                  <div className="space-y-6">
                    {/* Header with Quick Reset */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/5 dark:border-white/5">
                      <div>
                        <div className="font-semibold text-sm text-[#0d0d0d] dark:text-[#ececec] flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                          <span>Model & Generation Settings</span>
                        </div>
                        <div className="text-xs text-[#8e8e8e] mt-0.5">
                          Control output range limits, creativity, context RAM, and sampling
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetModelSettings}
                        className="px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 cursor-pointer transition-colors self-start sm:self-auto"
                        title="Restore model parameters to optimal defaults"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Parameters</span>
                      </button>
                    </div>

                    {/* Reset Feedback Notification */}
                    {resetFeedbackMsg && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <span className="font-medium">{resetFeedbackMsg}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setResetFeedbackMsg(null)}
                          className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200 text-xs font-semibold"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}

                    {/* Default Model Selection */}
                    <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-xs text-[#0d0d0d] dark:text-[#ececec]">Default Local Model</div>
                          <div className="text-[11.5px] text-[#8e8e8e]">Default model applied to newly initiated chats</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-black/5 dark:bg-white/10 text-neutral-700 dark:text-neutral-300">
                          {settings.defaultModel}
                        </span>
                      </div>
                      <select
                        value={settings.defaultModel}
                        onChange={e => {
                          const val = e.target.value;
                          setSettings(s => ({ ...s, defaultModel: val }));
                          setSelectedModel(val);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#242424] text-xs font-mono outline-none text-[#0d0d0d] dark:text-[#ececec] cursor-pointer focus:border-black/30 dark:focus:border-white/30"
                      >
                        {installedOllamaModels.map(m => (
                          <option key={m.name} value={m.name}>
                            {m.name} {m.details?.parameter_size ? `(${m.details.parameter_size})` : ''}
                          </option>
                        ))}
                        {!installedOllamaModels.some(m => m.name === 'qwen3:4b') && (
                          <option value="qwen3:4b">qwen3:4b (Recommended Default)</option>
                        )}
                        {!installedOllamaModels.some(m => m.name === 'qwen2.5:1.5b') && (
                          <option value="qwen2.5:1.5b">qwen2.5:1.5b (Fast & Lightweight)</option>
                        )}
                        {!installedOllamaModels.some(m => m.name === 'llama3.2:3b') && (
                          <option value="llama3.2:3b">llama3.2:3b (Meta LLaMA)</option>
                        )}
                        {!installedOllamaModels.some(m => m.name === 'deepseek-r1:7b') && (
                          <option value="deepseek-r1:7b">deepseek-r1:7b (Deep Reasoning Specialist)</option>
                        )}
                      </select>
                    </div>

                    {/* 1. Max Output Tokens (Model Output Range) */}
                    <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-xs text-[#0d0d0d] dark:text-[#ececec] flex items-center gap-1.5">
                            <span>Max Output Tokens (Response Range)</span>
                            <span className="text-[10px] text-neutral-400 font-mono">num_predict</span>
                          </div>
                          <div className="text-[11.5px] text-[#8e8e8e]">
                            Controls the upper limit of output tokens generated in a single response
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={128}
                            max={16384}
                            step={64}
                            value={settings.maxTokens}
                            onChange={e => {
                              const val = Math.max(128, Math.min(16384, Number(e.target.value) || 128));
                              setSettings(s => ({ ...s, maxTokens: val }));
                            }}
                            className="w-20 px-2 py-1 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-[#242424] font-mono text-xs text-right outline-none text-[#0d0d0d] dark:text-[#ececec]"
                          />
                          <span className="text-[11px] text-neutral-500 font-mono">tok</span>
                        </div>
                      </div>

                      {/* Range Slider */}
                      <div className="space-y-1">
                        <input
                          type="range"
                          min={128}
                          max={8192}
                          step={128}
                          value={settings.maxTokens}
                          onChange={e => setSettings(s => ({ ...s, maxTokens: Number(e.target.value) }))}
                          className="w-full accent-neutral-800 dark:accent-neutral-200 cursor-pointer h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none"
                        />
                        <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                          <span>128 tok (Brief)</span>
                          <span>2,048 tok (Default)</span>
                          <span>8,192 tok (Full Code)</span>
                        </div>
                      </div>

                      {/* Quick Presets for Output Range */}
                      <div className="pt-1">
                        <div className="text-[11px] text-neutral-500 mb-1.5 font-medium">Quick Output Range Presets:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { label: '512 (Brief)', val: 512 },
                            { label: '1,024 (Standard)', val: 1024 },
                            { label: '2,048 (Long - Default)', val: 2048 },
                            { label: '4,096 (Extended)', val: 4096 },
                            { label: '8,192 (Max Code)', val: 8192 }
                          ].map(preset => (
                            <button
                              key={preset.val}
                              type="button"
                              onClick={() => setSettings(s => ({ ...s, maxTokens: preset.val }))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                settings.maxTokens === preset.val
                                  ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 shadow-xs'
                                  : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-300'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 2. Temperature (Creativity vs Precision) */}
                    <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-xs text-[#0d0d0d] dark:text-[#ececec] flex items-center gap-1.5">
                            <span>Temperature</span>
                            <span className="text-[10px] text-neutral-400 font-mono">temperature</span>
                          </div>
                          <div className="text-[11.5px] text-[#8e8e8e]">
                            Balance between strictly predictable code/math and imaginative, conversational answers
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-md font-mono text-xs bg-black/5 dark:bg-white/10 text-neutral-800 dark:text-neutral-200 font-medium">
                          {settings.temperature.toFixed(2)} ({settings.temperature <= 0.25 ? 'Deterministic' : settings.temperature <= 0.75 ? 'Balanced' : 'Creative'})
                        </span>
                      </div>

                      {/* Temperature Slider */}
                      <div className="space-y-1">
                        <input
                          type="range"
                          min={0.0}
                          max={2.0}
                          step={0.05}
                          value={settings.temperature}
                          onChange={e => setSettings(s => ({ ...s, temperature: Number(e.target.value) }))}
                          className="w-full accent-neutral-800 dark:accent-neutral-200 cursor-pointer h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none"
                        />
                        <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                          <span>0.0 (Strict / Code)</span>
                          <span>0.7 (Balanced)</span>
                          <span>2.0 (High Variance)</span>
                        </div>
                      </div>

                      {/* Presets */}
                      <div className="pt-1">
                        <div className="text-[11px] text-neutral-500 mb-1.5 font-medium">Quick Temperature Presets:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { label: '0.2 (Code & Logic)', val: 0.2 },
                            { label: '0.7 (Balanced - Default)', val: 0.7 },
                            { label: '1.0 (Conversational)', val: 1.0 },
                            { label: '1.4 (Creative Writing)', val: 1.4 }
                          ].map(preset => (
                            <button
                              key={preset.val}
                              type="button"
                              onClick={() => setSettings(s => ({ ...s, temperature: preset.val }))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                Math.abs(settings.temperature - preset.val) < 0.01
                                  ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 shadow-xs'
                                  : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-300'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 3. Context Window Memory (num_ctx) */}
                    <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-xs text-[#0d0d0d] dark:text-[#ececec] flex items-center gap-1.5">
                            <span>Context Window Memory</span>
                            <span className="text-[10px] text-neutral-400 font-mono">num_ctx</span>
                          </div>
                          <div className="text-[11.5px] text-[#8e8e8e]">
                            Total RAM/VRAM token buffer allocated for chat history and attached code files
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-md font-mono text-xs bg-black/5 dark:bg-white/10 text-neutral-800 dark:text-neutral-200 font-medium">
                          {settings.contextWindow.toLocaleString()} tokens
                        </span>
                      </div>

                      {/* Presets Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                        {[
                          { label: '2,048', sub: 'Low RAM', val: 2048 },
                          { label: '4,096', sub: 'Standard (Default)', val: 4096 },
                          { label: '8,192', sub: 'High Context', val: 8192 },
                          { label: '16,384', sub: 'Large Files', val: 16384 },
                          { label: '32,768', sub: 'Maximum', val: 32768 }
                        ].map(preset => (
                          <button
                            key={preset.val}
                            type="button"
                            onClick={() => setSettings(s => ({ ...s, contextWindow: preset.val }))}
                            className={`p-2 rounded-lg text-left cursor-pointer transition-colors border ${
                              settings.contextWindow === preset.val
                                ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 border-transparent shadow-xs'
                                : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-300 border-black/5 dark:border-white/5'
                            }`}
                          >
                            <div className="text-xs font-mono font-semibold">{preset.label}</div>
                            <div className={`text-[10px] truncate ${settings.contextWindow === preset.val ? 'text-neutral-300 dark:text-neutral-700' : 'text-neutral-400'}`}>
                              {preset.sub}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 4. Advanced Sampling Parameters: Top-P, Top-K & Repeat Penalty */}
                    <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-4">
                      <div className="font-semibold text-xs text-[#0d0d0d] dark:text-[#ececec] flex items-center justify-between">
                        <span>Advanced Sampling Parameters</span>
                        <span className="text-[10px] text-neutral-400">Fine-tuning options</span>
                      </div>

                      {/* Top-P */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-neutral-700 dark:text-neutral-300 font-medium">Top-P (Nucleus Sampling)</span>
                          <span className="font-mono text-[11px] text-neutral-500">{(settings.topP ?? 0.9).toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={1.0}
                          step={0.05}
                          value={settings.topP ?? 0.9}
                          onChange={e => setSettings(s => ({ ...s, topP: Number(e.target.value) }))}
                          className="w-full accent-neutral-800 dark:accent-neutral-200 cursor-pointer h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none"
                        />
                        <div className="text-[10.5px] text-[#8e8e8e]">
                          Filters candidate pool to cumulative probability (0.90 recommended)
                        </div>
                      </div>

                      {/* Top-K */}
                      <div className="space-y-1.5 pt-2 border-t border-black/5 dark:border-white/5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-neutral-700 dark:text-neutral-300 font-medium">Top-K</span>
                          <span className="font-mono text-[11px] text-neutral-500">{settings.topK ?? 40}</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={100}
                          step={1}
                          value={settings.topK ?? 40}
                          onChange={e => setSettings(s => ({ ...s, topK: Number(e.target.value) }))}
                          className="w-full accent-neutral-800 dark:accent-neutral-200 cursor-pointer h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none"
                        />
                        <div className="text-[10.5px] text-[#8e8e8e]">
                          Reduces probability of generating unusual low-ranked words (40 recommended)
                        </div>
                      </div>

                      {/* Repeat Penalty */}
                      <div className="space-y-1.5 pt-2 border-t border-black/5 dark:border-white/5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-neutral-700 dark:text-neutral-300 font-medium">Repeat Penalty</span>
                          <span className="font-mono text-[11px] text-neutral-500">{(settings.repeatPenalty ?? 1.1).toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min={1.0}
                          max={2.0}
                          step={0.05}
                          value={settings.repeatPenalty ?? 1.1}
                          onChange={e => setSettings(s => ({ ...s, repeatPenalty: Number(e.target.value) }))}
                          className="w-full accent-neutral-800 dark:accent-neutral-200 cursor-pointer h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none"
                        />
                        <div className="text-[10.5px] text-[#8e8e8e]">
                          Prevents repetitiveness in longer answers (1.10 recommended)
                        </div>
                      </div>
                    </div>

                    {/* Reset Section at bottom of Model tab */}
                    <div className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-xs text-[#0d0d0d] dark:text-[#ececec]">Reset Model Configuration</div>
                        <div className="text-[11.5px] text-[#8e8e8e]">Revert output range, temperature, and context to standard defaults</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetModelSettings}
                        className="px-3.5 py-1.5 rounded-lg border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-medium text-neutral-800 dark:text-neutral-200 cursor-pointer transition-colors flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset to Defaults</span>
                      </button>
                    </div>
                  </div>
                )}

                {settingsTab === 'personalization' && (
                  <div className="space-y-4">
                    <div>
                      <div className="font-semibold text-xs mb-1">Custom System Instructions</div>
                      <textarea
                        value={settings.systemPrompt}
                        onChange={e => setSettings(s => ({ ...s, systemPrompt: e.target.value }))}
                        rows={5}
                        className="w-full p-3 rounded-xl border border-[#d0d0d0] dark:border-[#404040] bg-white dark:bg-[#282828] text-xs outline-none"
                      />
                    </div>
                  </div>
                )}

                {settingsTab === 'speech' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-xs">Voice Output</div>
                        <div className="text-xs text-[#8e8e8e]">Read responses aloud automatically</div>
                      </div>
                      <button
                        onClick={() => handleSpeakMessage('test', 'Hello! This is Claw Tear running locally on your device.')}
                        className="px-3 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black text-xs font-medium cursor-pointer"
                      >
                        Test Voice
                      </button>
                    </div>
                  </div>
                )}

                {settingsTab === 'data' && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
                      <div>
                        <div className="font-semibold text-xs">Export All Conversations</div>
                        <div className="text-xs text-[#8e8e8e]">Download all chat sessions as a JSON backup file</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleExportAllChats}
                        className="px-3 py-1.5 rounded-lg border border-[#d0d0d0] dark:border-[#404040] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export JSON</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
                      <div>
                        <div className="font-semibold text-xs">Import Conversations</div>
                        <div className="text-xs text-[#8e8e8e]">Restore chat sessions from a backup JSON file</div>
                      </div>
                      <label className="px-3 py-1.5 rounded-lg border border-[#d0d0d0] dark:border-[#404040] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-colors">
                        <FileCode className="w-3.5 h-3.5" />
                        <span>Import JSON</span>
                        <input
                          type="file"
                          accept=".json,application/json"
                          onChange={handleImportChatsFile}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-xs">Clear all chats</div>
                        <div className="text-xs text-[#8e8e8e]">Permanently delete history</div>
                      </div>
                      <button
                        onClick={() => {
                          const nonTemp = chats.filter(c => !c.isTemporary);
                          if (nonTemp.length > 0) {
                            setSelectedChatIds(nonTemp.map(c => c.id));
                            setShowSettingsModal(false);
                            setShowBulkDeleteModal(true);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg border border-black/15 dark:border-white/15 text-neutral-800 dark:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-medium cursor-pointer transition-colors"
                      >
                        Delete all
                      </button>
                    </div>
                  </div>
                )}

                {settingsTab === 'shortcuts' && (
                  <div className="space-y-4">
                    <div className="font-semibold text-xs mb-1">Keyboard Shortcuts Reference</div>
                    <div className="text-xs text-[#8e8e8e] mb-3">Accelerate your workflow with quick keybindings</div>

                    <div className="space-y-2">
                      {[
                        { key: '⌘ / Ctrl + K', desc: 'Focus sidebar search' },
                        { key: '⌘ / Ctrl + N', desc: 'Create a new conversation' },
                        { key: '⌘ / Ctrl + Shift + D', desc: 'Toggle multi-chat selection' },
                        { key: '⌘ / Ctrl + /', desc: 'Open shortcuts cheat sheet' },
                        { key: 'Enter', desc: 'Send message' },
                        { key: 'Shift + Enter', desc: 'Insert new line in prompt box' },
                        { key: 'Escape', desc: 'Close any active modal or menu' }
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5"
                        >
                          <span className="text-xs text-[#0d0d0d] dark:text-[#ececec]">{item.desc}</span>
                          <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 font-mono text-[11px] text-neutral-700 dark:text-neutral-300 shadow-2xs">
                            {item.key}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DELETE CONFIRMATION MODAL: Clear message, zero red color     */}
      {/* ============================================================ */}
      {showBulkDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-75"
          onClick={() => setShowBulkDeleteModal(false)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleConfirmBulkDelete();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setShowBulkDeleteModal(false);
            }
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-[420px] bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 p-5 text-[#0d0d0d] dark:text-[#ececec] flex flex-col gap-4 animate-in zoom-in-95 duration-75"
          >
            {/* Header & Icon (Clean neutral styling, NO RED) */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/10 text-neutral-800 dark:text-neutral-200 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-black dark:text-white leading-tight">
                  {selectedChatIds.length === 1 ? 'Delete conversation?' : `Delete ${selectedChatIds.length} conversations?`}
                </h3>
                <p className="text-xs text-[#8e8e8e] mt-1 leading-normal">
                  Confirmation required
                </p>
              </div>
            </div>

            {/* Clear Confirmation Message Box */}
            <div className="p-3.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
              <div className="font-semibold text-black dark:text-white mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 flex-shrink-0" />
                <span>Confirm deletion</span>
              </div>
              <p>
                Are you sure you want to delete {selectedChatIds.length === 1 ? 'this chat history' : `these ${selectedChatIds.length} chat histories`}? All messages, reasoning history, and attachments will be permanently removed. This action cannot be undone.
              </p>
            </div>

            {/* Compact Chat Title Preview */}
            <div className="max-h-24 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 scrollbar-thin">
              {selectedChatIds.slice(0, 3).map(id => {
                const chat = chats.find(c => c.id === id);
                return (
                  <div key={id} className="text-xs text-[#424242] dark:text-[#b4b4b4] flex items-center gap-2 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 flex-shrink-0" />
                    <span className="truncate">{chat?.title || 'Untitled chat'}</span>
                  </div>
                );
              })}
              {selectedChatIds.length > 3 && (
                <div className="text-[11px] text-[#8e8e8e] pl-3.5 italic">
                  + {selectedChatIds.length - 3} more
                </div>
              )}
            </div>

            {/* Clean Action Buttons (NO RED) */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-medium text-[#424242] dark:text-[#ececec] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                autoFocus
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 rounded-xl bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete {selectedChatIds.length === 1 ? 'chat' : `(${selectedChatIds.length})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ============================================================ */}
      {/* 5. KEYBOARD SHORTCUTS QUICK REFERENCE MODAL                  */}
      {/* ============================================================ */}
      {showShortcutsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100"
          onClick={() => setShowShortcutsModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-[#212121] rounded-2xl shadow-2xl border border-[#e5e5e5] dark:border-[#383838] overflow-hidden text-[#0d0d0d] dark:text-[#ececec] flex flex-col animate-in zoom-in-95 duration-100"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#e5e5e5] dark:border-[#383838] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
                  <Keyboard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-black dark:text-white">
                    Keyboard Shortcuts
                  </h3>
                  <p className="text-[11px] text-[#8e8e8e]">
                    Press any shortcut to trigger action
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 rounded-lg text-[#8e8e8e] hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-2.5 max-h-[60vh] overflow-y-auto scrollbar-thin">
              {[
                { key: '⌘ / Ctrl + K', desc: 'Search conversations in history' },
                { key: '⌘ / Ctrl + N', desc: 'Start a new conversation' },
                { key: '⌘ / Ctrl + Shift + D', desc: 'Select multiple chats to delete' },
                { key: '⌘ / Ctrl + /', desc: 'Open keyboard shortcuts sheet' },
                { key: 'Enter', desc: 'Send message' },
                { key: 'Shift + Enter', desc: 'Insert new line' },
                { key: 'Escape', desc: 'Close any active popup or cancel select' }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5"
                >
                  <span className="text-xs text-[#0d0d0d] dark:text-[#ececec]">{item.desc}</span>
                  <kbd className="px-2.5 py-1 rounded-md bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 font-mono text-[11px] text-neutral-800 dark:text-neutral-200 font-semibold shadow-2xs">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-[#f9f9f9] dark:bg-[#1c1c1c] border-t border-[#e5e5e5] dark:border-[#383838] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black text-xs font-medium cursor-pointer transition-colors shadow-xs"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
