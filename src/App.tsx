import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Volume2, Play, Pause, Download, Sparkles, Sliders, Languages, 
  Trash2, History, User, Check, RefreshCw, Layers, FileText, 
  VolumeX, Copy, CheckSquare, Plus, Save, Clock, BookOpen, 
  Settings, ChevronDown, Smile, Mic, Radio, Wand2, Cpu, 
  Subtitles, SlidersHorizontal, Zap, Flame, MessageSquare,
  Loader2, Bell
} from 'lucide-react';

// Types
interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female';
  lang: 'ru-RU' | 'en-US' | 'uk-UA' | 'es-ES' | 'de-DE';
  accent: string;
  description: string;
  voiceName?: string;
  persona?: string;
  provider?: 'gemini' | 'browser';
  category?: 'cinema' | 'narrator' | 'character' | 'asmr' | 'media' | 'custom' | 'system';
  avatar?: string;
}

interface ProjectRecord {
  id: string;
  text: string;
  voiceId: string;
  voiceName: string;
  speed: number;
  pitch: number;
  pauses: 'auto' | 'short' | 'long';
  duration: string;
  timestamp: string;
  wordCount: number;
  audioUrl?: string;
  modelUsed?: string;
}

interface PronunciationRule {
  original: string;
  replacement: string;
}

// Preset Texts
const PRESET_TEXTS = {
  narration: {
    title: 'Повествование (Книга)',
    ru: 'Технологии синтеза речи вышли на новый уровень с Gemini 3.8 Flash. Теперь искусственный интеллект передает живое дыхание, естественную хрипотцу и кинематографичный бархат голоса, делая аудиокниги и дубляж неотличимыми от работы голливудских актеров.',
    en: 'Speech synthesis technologies have reached incredible heights with Gemini 3.8 Flash. The artificial voice conveys natural breathing, subtle huskiness, and cinematic warmth, making voiceovers indistinguishable from Hollywood film actors.',
    uk: 'Технології синтезу мовлення вийшли на новий рівень з Gemini 3.8 Flash. Тепер штучний інтелект передає живе дихання, природну хрипоту та кінематографічний оксамит голосу, роблячи аудіокниги та дубляж невідрізними від роботи акторів кіно.',
    es: 'Las tecnologías de síntesis de voz han alcanzado alturas increíbles con Gemini 3.8 Flash. Ahora la voz transmite respiración viva, calidez cinematográfica y entonaciones realistas.',
    de: 'Sprachsynthesetechnologien haben mit Gemini 3.8 Flash ein neues Niveau erreicht. Jetzt vermittelt die künstliche Intelligenz lebendige Atmung, filmische Wärme und realistische Nuancen.'
  },
  commercial: {
    title: 'Рекламный спот',
    ru: 'Только сегодня! <breath> Откройте для себя новые грани звука с премиум-аудиосистемой Vox Studio. Невероятная четкость, глубокие басы и хрустальные высокие частоты. Получите скидку тридцать процентов по купону SOUND2026!',
    en: 'Limited offer! <breath> Discover the new dimension of pure sound with the premium Vox Studio speaker system. Crystal-clear high notes, deep punchy baselines, and absolute fidelity. Get thirty percent off today with code SOUND2026.',
    uk: 'Тільки сьогодні! <breath> Відкрийте для себе нові грані звуку з преміум-аудіосистемою Vox Studio. Неймовірна чіткість, глибокі баси та кришталеві високі частоти. Отримайте знижку тридцять відсотків за купоном SOUND2026!',
    es: '¡Solo hoy! <breath> Descubre nuevas dimensiones del sonido con el sistema de audio premium de Vox Studio. Increíble claridad, graves profundos y agudos cristalinos.',
    de: 'Nur heute! <breath> Entdecken Sie neue Klangdimensionen mit dem Premium-Audiosystem Vox Studio. Unglaubliche Klarheit, tiefe Bässe und kristallklare Höhen.'
  },
  dialogue: {
    title: 'Диалог двух дикторов (Сценарий)',
    ru: "Алекс: Привет! <breath> Рад тебя слышать. Как продвигается разработка новой студии озвучки?\nСэм: Привет, |yeah| все отлично! Мы только что обновили модель синтеза речи до Gemini 3.8 Flash.\nАлекс: Звучит впечатляюще! <laugh> Теперь голос звучит как настоящий живой актер в кино.\nСэм: Абсолютно, |mhm| добавились естественная хрипотца, студийный бас и живые эмоции.",
    en: "Alex: Hey there! <breath> Great to hear you. How is the new voiceover studio project coming along?\nSam: Hello! |yeah| Everything is incredible. We just upgraded the speech synthesis model to Gemini 3.8 Flash.\nAlex: That sounds stunning! <laugh> The voice now feels like a real movie actor in a sound booth.\nSam: Absolutely, |mhm| with natural huskiness, studio tube bass, and live vocal bursts.",
    uk: "Алекс: Привіт! <breath> Радий тебе чути. Як просувається оновлення нашої студії озвучення?\nСем: Привіт, |yeah| все чудово! Ми щойно оновили модель синтезу мовлення до Gemini 3.8 Flash.\nАлекс: Звучить вражаюче! <laugh> Тепер голос відчувається як справжній живий актор кіно.\nСем: Саме так, |mhm| з'явилися природна хрипота, студійний бас та щирі емоції.",
    es: "Alex: ¡Hola! <breath> Me alegra escucharte. ¿Cómo va el proyecto del estudio de doblaje?\nSam: ¡Hola, |yeah| todo genial! Acabamos de actualizar el motor de voz a Gemini 3.8 Flash.\nAlex: ¡Suena impresionante! <laugh> Ahora la voz parece de un actor de cine en directo.\nSam: Totalmente, |mhm| con calidez cinematográfica y respiración viva.",
    de: "Alex: Hallo! <breath> Schön, dich zu hören. Wie läuft die Entwicklung des Sprachstudios?\nSam: Hallo, |yeah| alles großartig! Wir haben das Sprachmodell auf Gemini 3.8 Flash aktualisiert.\nAlex: Klingt beeindruckend! <laugh> Die Stimme klingt wie ein echter Kinoschauspieler.\nSam: Absolut, |mhm| mit natürlicher Wärme und lebendigen Emotionen."
  },
  technical: {
    title: 'Техническая инструкция',
    ru: 'Для калибровки микрофона выполните следующие шаги. Первое: подключите кабель в гнездо три целых пять десятых миллиметра. Второе: расположитесь на расстоянии пятнадцати сантиметров от мембраны капсюля.',
    en: 'To calibrate the input stream, perform the following sequence. One: insert the connector into the corresponding three point five millimeter jack. Two: position your lips approximately fifteen centimeters away from the microphone capsule.',
    uk: "Для калібрування мікрофона виконайте такі кроки. Перше: підключіть кабель у гніздо три цілих п'ять десятих міліметра. Друге: розташуйтеся на відстані п'ятнадцяти сантиметрів від мембрани капсуля.",
    es: 'Para calibrar el micrófono, siga los siguientes pasos. Primero: conecte el cable en la toma de tres coma cinco milímetros. Segundo: colóquese a una distancia de quince centímetros de la membrana de la cápsula.',
    de: 'Um das Mikrofon zu kalibrieren, führen Sie die folgenden Schritte aus. Erstens: Schließen Sie das Kabel an die Drei-Komma-Fünf-Millimeter-Buchse an. Zweitens: Positionieren Sie sich in einer Entfernung von fünfzehn Zentimetern von der Kapselmembran.'
  }
};

const DEFAULT_RU_VOICES: VoiceOption[] = [
  { id: 'ru-male-1', name: 'Максим (Системный)', gender: 'male', lang: 'ru-RU', accent: 'Четкий дикторский', description: 'Стандартный системный мужской голос для новостей и справок', provider: 'browser', category: 'system', avatar: '💻' },
  { id: 'ru-female-1', name: 'Анна (Системная)', gender: 'female', lang: 'ru-RU', accent: 'Мягкий женский', description: 'Стандартный системный женский голос для чтения текстов', provider: 'browser', category: 'system', avatar: '💻' },
  { id: 'ru-male-2', name: 'Павел (Устройство)', gender: 'male', lang: 'ru-RU', accent: 'Деловой баритон', description: 'Системный голос Windows / macOS для презентаций', provider: 'browser', category: 'system', avatar: '💻' },
  { id: 'ru-female-2', name: 'Ирина (Устройство)', gender: 'female', lang: 'ru-RU', accent: 'Спокойный женский', description: 'Системный голос операционной системы для уведомлений', provider: 'browser', category: 'system', avatar: '💻' }
];

const DEFAULT_EN_VOICES: VoiceOption[] = [
  { id: 'en-male-1', name: 'James (System)', gender: 'male', lang: 'en-US', accent: 'Deep, Male (US)', description: 'Standard device voice for business presentations', provider: 'browser', category: 'system', avatar: '💻' },
  { id: 'en-female-1', name: 'Sarah (System)', gender: 'female', lang: 'en-US', accent: 'Warm, Female (US)', description: 'Standard device voice for educational storytelling', provider: 'browser', category: 'system', avatar: '💻' }
];

const DEFAULT_UK_VOICES: VoiceOption[] = [
  { id: 'uk-female-1', name: 'Леся (Системна)', gender: 'female', lang: 'uk-UA', accent: 'Природний, жіночий', description: 'Стандартний системний голос для художніх творів', provider: 'browser', category: 'system', avatar: '💻' },
  { id: 'uk-male-1', name: 'Тарас (Системний)', gender: 'male', lang: 'uk-UA', accent: 'Мужній, глибокий', description: 'Стандартний системний голос для презентацій', provider: 'browser', category: 'system', avatar: '💻' }
];

const DEFAULT_ES_VOICES: VoiceOption[] = [
  { id: 'es-female-1', name: 'Helena (Sistema)', gender: 'female', lang: 'es-ES', accent: 'Cálida, Femenina (España)', description: 'Voz del sistema para audiolibros y narraciones', provider: 'browser', category: 'system', avatar: '💻' },
  { id: 'es-male-1', name: 'Mateo (Sistema)', gender: 'male', lang: 'es-ES', accent: 'Claro, Masculino (México)', description: 'Voz del sistema para tutoriales corporativos', provider: 'browser', category: 'system', avatar: '💻' }
];

const DEFAULT_DE_VOICES: VoiceOption[] = [
  { id: 'de-male-1', name: 'Dieter (System)', gender: 'male', lang: 'de-DE', accent: 'Klar, Männlich (Deutschland)', description: 'Systemstimme für Dokumentationen und Schulungen', provider: 'browser', category: 'system', avatar: '💻' },
  { id: 'de-female-1', name: 'Marlene (System)', gender: 'female', lang: 'de-DE', accent: 'Sanft, Weiblich (Deutschland)', description: 'Systemstimme für Hörbücher und Werbespots', provider: 'browser', category: 'system', avatar: '💻' }
];

const getVoicesForLanguage = (lang: 'ru-RU' | 'en-US' | 'uk-UA' | 'es-ES' | 'de-DE'): VoiceOption[] => {
  switch (lang) {
    case 'ru-RU': return DEFAULT_RU_VOICES;
    case 'en-US': return DEFAULT_EN_VOICES;
    case 'uk-UA': return DEFAULT_UK_VOICES;
    case 'es-ES': return DEFAULT_ES_VOICES;
    case 'de-DE': return DEFAULT_DE_VOICES;
    default: return DEFAULT_RU_VOICES;
  }
};

// Rich Gemini 3.8 Persona Profiles Categorized
const GEMINI_VOICES: Record<string, VoiceOption[]> = {
  'ru-RU': [
    // 🎬 Кинодубляж & Звезды
    { 
      id: 'gemini-zephyr', 
      name: 'Брэд Питт (Кино)', 
      gender: 'male', 
      lang: 'ru-RU', 
      accent: 'Кинодубляж (Хриплый баритон)', 
      description: 'Харизматичный, живой баритон с легкой хрипотцой, бархатистым vocal fry и кино-шармом Брэда Питта.', 
      voiceName: 'Charon', 
      persona: 'pitt', 
      provider: 'gemini',
      category: 'cinema',
      avatar: '🎬'
    },
    { 
      id: 'gemini-freeman', 
      name: 'Морган Фриман (Кино)', 
      gender: 'male', 
      lang: 'ru-RU', 
      accent: 'Легендарный бас-рассказчик', 
      description: 'Сверхглубокий, величественный, бархатный бас. Создан для документальных фильмов, аудиокниг и эпических историй.', 
      voiceName: 'Charon', 
      persona: 'freeman', 
      provider: 'gemini',
      category: 'cinema',
      avatar: '🎙️'
    },
    { 
      id: 'gemini-keanu', 
      name: 'Киану Ривз (Джон Уик / Нео)', 
      gender: 'male', 
      lang: 'ru-RU', 
      accent: 'Спокойный магнетический баритон', 
      description: 'Сдержанный, стильный, философский тембр с внутренней силой для нуара, фантастики и боевиков.', 
      voiceName: 'Charon', 
      persona: 'keanu', 
      provider: 'gemini',
      category: 'cinema',
      avatar: '🕶️'
    },
    { 
      id: 'gemini-dicaprio', 
      name: 'Леонардо ДиКаприо (Дубляж)', 
      gender: 'male', 
      lang: 'ru-RU', 
      accent: 'Экспрессивный актерский дубляж', 
      description: 'Эмоциональный, яркий драматический голос с высокой экспрессией для кинотрейлеров и драматических сцен.', 
      voiceName: 'Puck', 
      persona: 'dicaprio', 
      provider: 'gemini',
      category: 'cinema',
      avatar: '🎭'
    },
    { 
      id: 'gemini-statham', 
      name: 'Джейсон Стэйтем (Экшн)', 
      gender: 'male', 
      lang: 'ru-RU', 
      accent: 'Брутальный хриплый мужской', 
      description: 'Низкий, резкий, уверенный голос героя боевиков с характерным уличным акцентом.', 
      voiceName: 'Charon', 
      persona: 'statham', 
      provider: 'gemini',
      category: 'cinema',
      avatar: '👊'
    },

    // 🎙️ Дикторы & Новости
    { 
      id: 'gemini-maxim', 
      name: 'Максим (Диктор ТВ & Новости)', 
      gender: 'male', 
      lang: 'ru-RU', 
      accent: 'Студийный дикторский эталон', 
      description: 'Безупречная дикция, авторитетная подача и четкая артикуляция для новостей, отчетов и презентаций.', 
      voiceName: 'Charon', 
      persona: 'maxim', 
      provider: 'gemini',
      category: 'narrator',
      avatar: '📺'
    },
    { 
      id: 'gemini-anna', 
      name: 'Анна (Аудиокниги & Реклама)', 
      gender: 'female', 
      lang: 'ru-RU', 
      accent: 'Чистый мелодичный женский', 
      description: 'Нежный, естественный и выразительный женский голос для художественных аудиокниг и рекламы.', 
      voiceName: 'Kore', 
      persona: 'anna', 
      provider: 'gemini',
      category: 'narrator',
      avatar: '📖'
    },
    { 
      id: 'gemini-mikhail', 
      name: 'Михаил (Документалист Discovery)', 
      gender: 'male', 
      lang: 'ru-RU', 
      accent: 'Глубокий академический тембр', 
      description: 'Основательный, мудрый тон для научно-популярных фильмов, истории и географии.', 
      voiceName: 'Charon', 
      persona: 'mikhail', 
      provider: 'gemini',
      category: 'narrator',
      avatar: '🏛️'
    },
    { 
      id: 'gemini-victoria', 
      name: 'Виктория (Телеведущая)', 
      gender: 'female', 
      lang: 'ru-RU', 
      accent: 'Яркий лучезарный женский', 
      description: 'Современный, позитивный женский тембр для lifestyle-роликов, интервью и утренних шоу.', 
      voiceName: 'Kore', 
      persona: 'victoria', 
      provider: 'gemini',
      category: 'narrator',
      avatar: '✨'
    },
    { 
      id: 'gemini-elena', 
      name: 'Елена (Драматическая актриса)', 
      gender: 'female', 
      lang: 'ru-RU', 
      accent: 'Глубокий драматический голос', 
      description: 'Глубокий эмоциональный женский тембр с богатыми актерскими переживаниями и интонациями.', 
      voiceName: 'Fenrir', 
      persona: 'elena', 
      provider: 'gemini',
      category: 'narrator',
      avatar: '🌹'
    },

    // ✨ Персонажи & Игры
    { 
      id: 'gemini-cyberpunk', 
      name: 'Киберпанк Детектив', 
      gender: 'male', 
      lang: 'ru-RU', 
      accent: 'Нуарный хриплый детектив', 
      description: 'Уставший, прокуренный, шероховатый голос сыщика из неонового мегаполиса. Атмосфера триллера и тайны.', 
      voiceName: 'Charon', 
      persona: 'cyberpunk', 
      provider: 'gemini',
      category: 'character',
      avatar: '🌃'
    },
    { 
      id: 'gemini-witcher', 
      name: 'Ведьмак (Геральт)', 
      gender: 'male', 
      lang: 'ru-RU', 
      accent: 'Суровый охотник на чудовищ', 
      description: 'Хриплый, низкий, сдержанный баритон с хладнокровной иронией для фэнтези и RPG-игр.', 
      voiceName: 'Charon', 
      persona: 'witcher', 
      provider: 'gemini',
      category: 'character',
      avatar: '⚔️'
    },
    { 
      id: 'gemini-radio-dj', 
      name: 'Радио DJ (Ночной эфир FM)', 
      gender: 'male', 
      lang: 'ru-RU', 
      accent: 'Бархатный радиовещательный', 
      description: 'Интимный, обволакивающий, согревающий голос диктора ночной радиостанции.', 
      voiceName: 'Charon', 
      persona: 'radio_dj', 
      provider: 'gemini',
      category: 'character',
      avatar: '📻'
    },
    { 
      id: 'gemini-sports', 
      name: 'Спортивный комментатор', 
      gender: 'male', 
      lang: 'ru-RU', 
      accent: 'Взрывной динамичный драйв', 
      description: 'Голос на пределе накала страстей для матчей, гонок, киберспорта и динамичных промо.', 
      voiceName: 'Puck', 
      persona: 'sports', 
      provider: 'gemini',
      category: 'character',
      avatar: '⚽'
    },
    { 
      id: 'gemini-fairytale', 
      name: 'Сказочник (Мудрый Дедушка)', 
      gender: 'male', 
      lang: 'ru-RU', 
      accent: 'Теплый убаюкивающий бас', 
      description: 'Добрейший, теплый голос дедушки у камина для детских сказок, мифов и притч.', 
      voiceName: 'Charon', 
      persona: 'fairytale', 
      provider: 'gemini',
      category: 'character',
      avatar: '🧙'
    },
    { 
      id: 'gemini-robot', 
      name: 'Робот-киборг (Sci-Fi AI)', 
      gender: 'male', 
      lang: 'ru-RU', 
      accent: 'Механический футуристичный', 
      description: 'Синтетический роботизированный голос андроида из фантастических фильмов.', 
      voiceName: 'Charon', 
      persona: 'robot', 
      provider: 'gemini',
      category: 'character',
      avatar: '🦾'
    },

    // 🧘 ASMR & Релакс
    { 
      id: 'gemini-meditation', 
      name: 'Медитация / ASMR (Шепот)', 
      gender: 'female', 
      lang: 'ru-RU', 
      accent: 'Бархатный убаюкивающий шепот', 
      description: 'Нежный, расслабляющий шепот с мягким дыханием для релаксации, сна, йоги и глубокой медитации.', 
      voiceName: 'Kore', 
      persona: 'meditation', 
      provider: 'gemini',
      category: 'asmr',
      avatar: '🧘'
    },

    // 📱 Медиа & Блоги
    { 
      id: 'gemini-podcast', 
      name: 'Ведущий YouTube / Подкаста', 
      gender: 'male', 
      lang: 'ru-RU', 
      accent: 'Драйвовый блогер (Puck)', 
      description: 'Энергичный, динамичный, современный голос с живой подачей для роликов, рекламы и интервью.', 
      voiceName: 'Puck', 
      persona: 'podcast_host', 
      provider: 'gemini',
      category: 'media',
      avatar: '🔥'
    },
    { 
      id: 'gemini-business', 
      name: 'Бизнес-спикер / Лидер', 
      gender: 'male', 
      lang: 'ru-RU', 
      accent: 'Уверенный статусный баритон', 
      description: 'Авторитетный голос CEO для корпоративных питчей, инвестиционных презентаций и тренингов.', 
      voiceName: 'Charon', 
      persona: 'business', 
      provider: 'gemini',
      category: 'media',
      avatar: '💼'
    },
    { 
      id: 'gemini-comedy', 
      name: 'Стендап-комик', 
      gender: 'male', 
      lang: 'ru-RU', 
      accent: 'Ироничный живой артист', 
      description: 'Юмористический тембр с тонким сарказмом и идеальными комедийными паузами.', 
      voiceName: 'Puck', 
      persona: 'comedy', 
      provider: 'gemini',
      category: 'media',
      avatar: '😂'
    },
    { 
      id: 'gemini-ai-assistant', 
      name: 'Голосовой ассистент AI', 
      gender: 'female', 
      lang: 'ru-RU', 
      accent: 'Умный дружелюбный помощник', 
      description: 'Приятный, футуристичный голос персонального ИИ-помощника для навигаторов и умных домов.', 
      voiceName: 'Kore', 
      persona: 'ai_assistant', 
      provider: 'gemini',
      category: 'media',
      avatar: '🤖'
    },

    // 🛠️ Конструктор тембра
    { 
      id: 'gemini-custom', 
      name: 'Конструктор тембра (Свой промпт)', 
      gender: 'male', 
      lang: 'ru-RU', 
      accent: 'Пользовательский дизайн голоса', 
      description: 'Опишите словами любой тембр, акцент, возраст или манеру речи, и нейросеть сгенерирует уникальный голос.', 
      voiceName: 'Charon', 
      persona: 'custom', 
      provider: 'gemini',
      category: 'custom',
      avatar: '🪄'
    }
  ],
  'en-US': [
    { id: 'gemini-zephyr', name: 'Brad Pitt (Cinematic)', gender: 'male', lang: 'en-US', accent: 'Warm Husky Baritone', description: 'Iconic cinematic laid-back baritone with warm vocal fry and subtle hoarseness.', voiceName: 'Charon', persona: 'pitt', provider: 'gemini', category: 'cinema', avatar: '🎬' },
    { id: 'gemini-freeman', name: 'Morgan Freeman (Narrator)', gender: 'male', lang: 'en-US', accent: 'Legendary Deep Bass', description: 'Ultra-deep, resonant, majestic voice for documentaries and epic storytelling.', voiceName: 'Charon', persona: 'freeman', provider: 'gemini', category: 'cinema', avatar: '🎙️' },
    { id: 'gemini-keanu', name: 'Keanu Reeves (Action)', gender: 'male', lang: 'en-US', accent: 'Magnetic Restrained Tone', description: 'Cool, collected, iconic baritone for mystery and action thrillers.', voiceName: 'Charon', persona: 'keanu', provider: 'gemini', category: 'cinema', avatar: '🕶️' },
    { id: 'gemini-dicaprio', name: 'Leonardo DiCaprio', gender: 'male', lang: 'en-US', accent: 'Passionate Dramatic Lead', description: 'Vibrant, emotionally gripping movie acting voice.', voiceName: 'Puck', persona: 'dicaprio', provider: 'gemini', category: 'cinema', avatar: '🎭' },
    { id: 'gemini-statham', name: 'Jason Statham (Action)', gender: 'male', lang: 'en-US', accent: 'Gritty Curt Hero', description: 'Deep, tough, confident streetwise hero voice.', voiceName: 'Charon', persona: 'statham', provider: 'gemini', category: 'cinema', avatar: '👊' },
    { id: 'gemini-maxim', name: 'David (News Anchor)', gender: 'male', lang: 'en-US', accent: 'Authoritative Broadcaster', description: 'Crystal-clear articulation for national news, presentations, and reports.', voiceName: 'Charon', persona: 'maxim', provider: 'gemini', category: 'narrator', avatar: '📺' },
    { id: 'gemini-anna', name: 'Sarah (Audiobook Narrator)', gender: 'female', lang: 'en-US', accent: 'Warm Pleasant Female', description: 'Gentle, natural, and expressive voice for audiobooks and commercial ads.', voiceName: 'Kore', persona: 'anna', provider: 'gemini', category: 'narrator', avatar: '📖' },
    { id: 'gemini-mikhail', name: 'Michael (Documentary Host)', gender: 'male', lang: 'en-US', accent: 'Resonant Academic Tone', description: 'Authoritative, calm tone for science and natural history documentaries.', voiceName: 'Charon', persona: 'mikhail', provider: 'gemini', category: 'narrator', avatar: '🏛️' },
    { id: 'gemini-victoria', name: 'Victoria (TV Presenter)', gender: 'female', lang: 'en-US', accent: 'Polished Lifestyle Host', description: 'Bright, engaging female tone for morning shows and product reviews.', voiceName: 'Kore', persona: 'victoria', provider: 'gemini', category: 'narrator', avatar: '✨' },
    { id: 'gemini-elena', name: 'Elena (Dramatic Actress)', gender: 'female', lang: 'en-US', accent: 'Deep Expressive Emotion', description: 'Rich, emotionally moving theater and cinematic voiceover.', voiceName: 'Fenrir', persona: 'elena', provider: 'gemini', category: 'narrator', avatar: '🌹' },
    { id: 'gemini-cyberpunk', name: 'Cyberpunk Noir Detective', gender: 'male', lang: 'en-US', accent: 'Gritty Smoky Baritone', description: 'World-weary, gravelly detective voice for mystery and dramatic fiction.', voiceName: 'Charon', persona: 'cyberpunk', provider: 'gemini', category: 'character', avatar: '🌃' },
    { id: 'gemini-witcher', name: 'Geralt of Rivia (The Witcher)', gender: 'male', lang: 'en-US', accent: 'Gruff Lethal Confidence', description: 'Low, raspy, mutant monster hunter voice for fantasy and gaming.', voiceName: 'Charon', persona: 'witcher', provider: 'gemini', category: 'character', avatar: '⚔️' },
    { id: 'gemini-radio-dj', name: 'Night FM Radio DJ', gender: 'male', lang: 'en-US', accent: 'Velvety Late-Night Host', description: 'Intimate, soothing, warm voice of a midnight radio presenter.', voiceName: 'Charon', persona: 'radio_dj', provider: 'gemini', category: 'character', avatar: '📻' },
    { id: 'gemini-sports', name: 'Live Sports Commentator', gender: 'male', lang: 'en-US', accent: 'Fast-Paced High Energy', description: 'Explosive, breathless commentary for sports matches and hype trailers.', voiceName: 'Puck', persona: 'sports', provider: 'gemini', category: 'character', avatar: '⚽' },
    { id: 'gemini-fairytale', name: 'Wise Storyteller', gender: 'male', lang: 'en-US', accent: 'Gentle Fireplace Bass', description: 'Loving grandfather voice for bedtime stories, fables, and myths.', voiceName: 'Charon', persona: 'fairytale', provider: 'gemini', category: 'character', avatar: '🧙' },
    { id: 'gemini-robot', name: 'Cyborg Android (Sci-Fi AI)', gender: 'male', lang: 'en-US', accent: 'Mechanical Robotic Tone', description: 'Futuristic synthetic robot voice with crisp cyber articulation.', voiceName: 'Charon', persona: 'robot', provider: 'gemini', category: 'character', avatar: '🦾' },
    { id: 'gemini-meditation', name: 'Serene Meditation / ASMR', gender: 'female', lang: 'en-US', accent: 'Soft Breathy Whisper', description: 'Intimate soothing whisper for mindfulness, sleep guidance, and ASMR.', voiceName: 'Kore', persona: 'meditation', provider: 'gemini', category: 'asmr', avatar: '🧘' },
    { id: 'gemini-podcast', name: 'YouTube & Podcast Host', gender: 'male', lang: 'en-US', accent: 'Punchy Youthful Creator', description: 'Fast, charismatic, and enthusiastic pacing for dynamic video voiceovers.', voiceName: 'Puck', persona: 'podcast_host', provider: 'gemini', category: 'media', avatar: '🔥' },
    { id: 'gemini-business', name: 'Executive Keynote Speaker', gender: 'male', lang: 'en-US', accent: 'Authoritative Corporate Voice', description: 'Confident corporate pitch leader for tech launches and business.', voiceName: 'Charon', persona: 'business', provider: 'gemini', category: 'media', avatar: '💼' },
    { id: 'gemini-comedy', name: 'Stand-up Comedian', gender: 'male', lang: 'en-US', accent: 'Playful Sarcastic Witty', description: 'Humorous, animated delivery with comedic pacing and irony.', voiceName: 'Puck', persona: 'comedy', provider: 'gemini', category: 'media', avatar: '😂' },
    { id: 'gemini-ai-assistant', name: 'Smart AI Assistant', gender: 'female', lang: 'en-US', accent: 'Polite Articulated Helper', description: 'Futuristic friendly digital assistant for apps and smart home.', voiceName: 'Kore', persona: 'ai_assistant', provider: 'gemini', category: 'media', avatar: '🤖' },
    { id: 'gemini-custom', name: 'Custom Voice Designer', gender: 'male', lang: 'en-US', accent: 'User-Defined Persona', description: 'Type any natural language voice prompt to craft custom tones.', voiceName: 'Charon', persona: 'custom', provider: 'gemini', category: 'custom', avatar: '🪄' }
  ],
  'uk-UA': [
    { id: 'gemini-zephyr', name: 'Бред Пітт (Кінодубляж)', gender: 'male', lang: 'uk-UA', accent: 'Кінодубляж (Хрипкий баритон)', description: 'Харизматичний чоловічий голос у стилі Бреда Пітта. Злегка хрипкий, теплий, оксамитовий.', voiceName: 'Charon', persona: 'pitt', provider: 'gemini', category: 'cinema', avatar: '🎬' },
    { id: 'gemini-freeman', name: 'Морган Фрімен (Кіно)', gender: 'male', lang: 'uk-UA', accent: 'Легендарний бас-оповідач', description: 'Надглибокий, величний, оксамитовий бас для документалістики та аудіокниг.', voiceName: 'Charon', persona: 'freeman', provider: 'gemini', category: 'cinema', avatar: '🎙️' },
    { id: 'gemini-keanu', name: 'Кіану Рівз (Джон Вік)', gender: 'male', lang: 'uk-UA', accent: 'Стриманий магнетичний тон', description: 'Холоднокровний, стриманий, філософський тембр для нуару та бойовиків.', voiceName: 'Charon', persona: 'keanu', provider: 'gemini', category: 'cinema', avatar: '🕶️' },
    { id: 'gemini-dicaprio', name: 'Леонардо ДіКапріо', gender: 'male', lang: 'uk-UA', accent: 'Експресивний акторський дубляж', description: 'Яскравий емоційний голос для драматичних моментів та трейлерів.', voiceName: 'Puck', persona: 'dicaprio', provider: 'gemini', category: 'cinema', avatar: '🎭' },
    { id: 'gemini-statham', name: 'Джейсон Стейтем', gender: 'male', lang: 'uk-UA', accent: 'Брутальний екшн баритон', description: 'Впевнений, низький голос героя бойовиків.', voiceName: 'Charon', persona: 'statham', provider: 'gemini', category: 'cinema', avatar: '👊' },
    { id: 'gemini-maxim', name: 'Максим (Диктор новин)', gender: 'male', lang: 'uk-UA', accent: 'Чітка телевізійна дикція', description: 'Ідеальна артикуляція та авторитетна подача для новин та звітів.', voiceName: 'Charon', persona: 'maxim', provider: 'gemini', category: 'narrator', avatar: '📺' },
    { id: 'gemini-anna', name: 'Леся (Аудіокниги)', gender: 'female', lang: 'uk-UA', accent: 'Мелодійний жіночий голос', description: 'Природний, ніжний та виразний голос для художніх аудіокниг.', voiceName: 'Kore', persona: 'anna', provider: 'gemini', category: 'narrator', avatar: '📖' },
    { id: 'gemini-mikhail', name: 'Михайло (Документаліст)', gender: 'male', lang: 'uk-UA', accent: 'Академічний глибокий бас', description: 'Мудрий тон для наукових та історичних фільмів.', voiceName: 'Charon', persona: 'mikhail', provider: 'gemini', category: 'narrator', avatar: '🏛️' },
    { id: 'gemini-victoria', name: 'Вікторія (Телеведуча)', gender: 'female', lang: 'uk-UA', accent: 'Яскравий сучасний тембр', description: 'Позитивний та приємний тембр для ранкових шоу та блогів.', voiceName: 'Kore', persona: 'victoria', provider: 'gemini', category: 'narrator', avatar: '✨' },
    { id: 'gemini-elena', name: 'Олена (Драматична актриса)', gender: 'female', lang: 'uk-UA', accent: 'Глибокий емоційний голос', description: 'Акторські інтонації та проникливе читання.', voiceName: 'Fenrir', persona: 'elena', provider: 'gemini', category: 'narrator', avatar: '🌹' },
    { id: 'gemini-cyberpunk', name: 'Кіберпанк Детектив', gender: 'male', lang: 'uk-UA', accent: 'Нуарний хрипкий голос', description: 'Втомлений, нуарний детектив з хрипотою для атмосферного читання.', voiceName: 'Charon', persona: 'cyberpunk', provider: 'gemini', category: 'character', avatar: '🌃' },
    { id: 'gemini-witcher', name: 'Геральт з Рівії (Відьмак)', gender: 'male', lang: 'uk-UA', accent: 'Суворий мисливець', description: 'Хрипкий, низький голос відьмака для атмосферних фентезі та ігор.', voiceName: 'Charon', persona: 'witcher', provider: 'gemini', category: 'character', avatar: '⚔️' },
    { id: 'gemini-radio-dj', name: 'Радіо DJ (Нічний ефір FM)', gender: 'male', lang: 'uk-UA', accent: 'Оксамитовий радіоголос', description: 'Теплий, заспокійливий голос ведучого нічного ефіру.', voiceName: 'Charon', persona: 'radio_dj', provider: 'gemini', category: 'character', avatar: '📻' },
    { id: 'gemini-sports', name: 'Спортивний коментатор', gender: 'male', lang: 'uk-UA', accent: 'Вибуховий драйв', description: 'Швидкий та енергійний голос для матчів та кіберспорту.', voiceName: 'Puck', persona: 'sports', provider: 'gemini', category: 'character', avatar: '⚽' },
    { id: 'gemini-fairytale', name: 'Казкар (Добрий Дідусь)', gender: 'male', lang: 'uk-UA', accent: 'Теплий басовитий голос', description: 'Мудрий дідусь біля каміна для дитячих казок та притч.', voiceName: 'Charon', persona: 'fairytale', provider: 'gemini', category: 'character', avatar: '🧙' },
    { id: 'gemini-robot', name: 'Кіборг-робот (Sci-Fi AI)', gender: 'male', lang: 'uk-UA', accent: 'Механічний футуристичний', description: 'Синтетичний роботизований тембр андроїда.', voiceName: 'Charon', persona: 'robot', provider: 'gemini', category: 'character', avatar: '🦾' },
    { id: 'gemini-meditation', name: 'Медитація / ASMR', gender: 'female', lang: 'uk-UA', accent: 'Ніжний заспокійливий шепіт', description: 'Оксамитовий пошепки з м’яким придихом для релаксації та сну.', voiceName: 'Kore', persona: 'meditation', provider: 'gemini', category: 'asmr', avatar: '🧘' },
    { id: 'gemini-podcast', name: 'Ведучий Подкасту / YouTube', gender: 'male', lang: 'uk-UA', accent: 'Драйвовий ведучий (Puck)', description: 'Активний, сучасний тембр з бездоганною виразною дикцією.', voiceName: 'Puck', persona: 'podcast_host', provider: 'gemini', category: 'media', avatar: '🔥' },
    { id: 'gemini-business', name: 'Бізнес-лідер / Спікер', gender: 'male', lang: 'uk-UA', accent: 'Авторитетний статусний голос', description: 'Впевнений тон для презентацій та інвестиційних виступів.', voiceName: 'Charon', persona: 'business', provider: 'gemini', category: 'media', avatar: '💼' },
    { id: 'gemini-comedy', name: 'Стендап-комік', gender: 'male', lang: 'uk-UA', accent: 'Іронічний артистичний', description: 'Тонкий сарказм та живе комедійне відчуття таймінгу.', voiceName: 'Puck', persona: 'comedy', provider: 'gemini', category: 'media', avatar: '😂' },
    { id: 'gemini-ai-assistant', name: 'Розумний асистент AI', gender: 'female', lang: 'uk-UA', accent: 'Ввічливий помічник', description: 'Футуристичний приємний голос цифрового помічника.', voiceName: 'Kore', persona: 'ai_assistant', provider: 'gemini', category: 'media', avatar: '🤖' },
    { id: 'gemini-custom', name: 'Конструктор тембру', gender: 'male', lang: 'uk-UA', accent: 'Власний промпт голосу', description: 'Опишіть будь-який голос словами для створення власного унікального диктора.', voiceName: 'Charon', persona: 'custom', provider: 'gemini', category: 'custom', avatar: '🪄' }
  ],
  'es-ES': [
    { id: 'gemini-zephyr', name: 'Brad Pitt (Doblaje Cine)', gender: 'male', lang: 'es-ES', accent: 'Barítono Ronco y Cálido', description: 'Voz carismática con leve carraspeo y tono cinematográfico.', voiceName: 'Charon', persona: 'pitt', provider: 'gemini', category: 'cinema', avatar: '🎬' },
    { id: 'gemini-freeman', name: 'Morgan Freeman (Narrador)', gender: 'male', lang: 'es-ES', accent: 'Bajo Resonante Legendario', description: 'Tono majestuoso y solemne para documentales épicos.', voiceName: 'Charon', persona: 'freeman', provider: 'gemini', category: 'cinema', avatar: '🎙️' },
    { id: 'gemini-keanu', name: 'Keanu Reeves (Acción)', gender: 'male', lang: 'es-ES', accent: 'Tono Magnético Contenido', description: 'Voz profunda y serena para suspense y thrillers.', voiceName: 'Charon', persona: 'keanu', provider: 'gemini', category: 'cinema', avatar: '🕶️' },
    { id: 'gemini-dicaprio', name: 'Leonardo DiCaprio', gender: 'male', lang: 'es-ES', accent: 'Dramático y Apasionado', description: 'Voz actoral vibrante con gran carga emotiva.', voiceName: 'Puck', persona: 'dicaprio', provider: 'gemini', category: 'cinema', avatar: '🎭' },
    { id: 'gemini-statham', name: 'Jason Statham (Acción)', gender: 'male', lang: 'es-ES', accent: 'Rudo y Decidido', description: 'Voz enérgica y directa de protagonista de acción.', voiceName: 'Charon', persona: 'statham', provider: 'gemini', category: 'cinema', avatar: '👊' },
    { id: 'gemini-maxim', name: 'Carlos (Presentador Noticias)', gender: 'male', lang: 'es-ES', accent: 'Locutor Televisivo Impecable', description: 'Dicción perfecta para telediarios y comunicados oficiales.', voiceName: 'Charon', persona: 'maxim', provider: 'gemini', category: 'narrator', avatar: '📺' },
    { id: 'gemini-anna', name: 'Lucía (Audiolibros)', gender: 'female', lang: 'es-ES', accent: 'Voz Clara Institucional', description: 'Voz femenina fluida y melodiosa, idónea para audiolibros.', voiceName: 'Kore', persona: 'anna', provider: 'gemini', category: 'narrator', avatar: '📖' },
    { id: 'gemini-mikhail', name: 'Mateo (Documentales)', gender: 'male', lang: 'es-ES', accent: 'Tono Académico Sabio', description: 'Voz profunda para divulgación científica e historia.', voiceName: 'Charon', persona: 'mikhail', provider: 'gemini', category: 'narrator', avatar: '🏛️' },
    { id: 'gemini-victoria', name: 'Victoria (Presentadora TV)', gender: 'female', lang: 'es-ES', accent: 'Brillante y Cercana', description: 'Estilo dinámico y optimista para entretenimiento.', voiceName: 'Kore', persona: 'victoria', provider: 'gemini', category: 'narrator', avatar: '✨' },
    { id: 'gemini-elena', name: 'Elena (Actriz Dramática)', gender: 'female', lang: 'es-ES', accent: 'Expresiva y Profunda', description: 'Matices emocionales para teatro y obras cinematográficas.', voiceName: 'Fenrir', persona: 'elena', provider: 'gemini', category: 'narrator', avatar: '🌹' },
    { id: 'gemini-cyberpunk', name: 'Detective Cyberpunk', gender: 'male', lang: 'es-ES', accent: 'Ronco y Sombrío Noir', description: 'Investigador cansado en una metrópoli futurista.', voiceName: 'Charon', persona: 'cyberpunk', provider: 'gemini', category: 'character', avatar: '🌃' },
    { id: 'gemini-witcher', name: 'Geralt de Rivia (Brujo)', gender: 'male', lang: 'es-ES', accent: 'Cazador Curtido y Ronco', description: 'Bajo áspero y letal para historias de fantasía.', voiceName: 'Charon', persona: 'witcher', provider: 'gemini', category: 'character', avatar: '⚔️' },
    { id: 'gemini-radio-dj', name: 'Locutor Radio Nocturna', gender: 'male', lang: 'es-ES', accent: 'Cálido y Aterciopelado', description: 'Intimidad y calma para emisiones nocturnas de FM.', voiceName: 'Charon', persona: 'radio_dj', provider: 'gemini', category: 'character', avatar: '📻' },
    { id: 'gemini-sports', name: 'Comentarista Deportivo', gender: 'male', lang: 'es-ES', accent: 'Frenesí y Gran Energía', description: 'Ritmo vertiginoso para fútbol y retransmisiones en vivo.', voiceName: 'Puck', persona: 'sports', provider: 'gemini', category: 'character', avatar: '⚽' },
    { id: 'gemini-fairytale', name: 'Narrador de Cuentos', gender: 'male', lang: 'es-ES', accent: 'Abuelo Tierno y Sabio', description: 'Voz reconfortante para fábulas y relatos infantiles.', voiceName: 'Charon', persona: 'fairytale', provider: 'gemini', category: 'character', avatar: '🧙' },
    { id: 'gemini-robot', name: 'Androide Sci-Fi', gender: 'male', lang: 'es-ES', accent: 'Robótico Sintetizado', description: 'Voz cibernética y rítmica de androide futurista.', voiceName: 'Charon', persona: 'robot', provider: 'gemini', category: 'character', avatar: '🦾' },
    { id: 'gemini-meditation', name: 'Meditación / ASMR', gender: 'female', lang: 'es-ES', accent: 'Susurro Relajante', description: 'Susurro suave y calmante para meditación y audiolibros nocturnos.', voiceName: 'Kore', persona: 'meditation', provider: 'gemini', category: 'asmr', avatar: '🧘' },
    { id: 'gemini-podcast', name: 'Creador de Podcast / YouTube', gender: 'male', lang: 'es-ES', accent: 'Joven Dinámico y Fresco', description: 'Locución activa para vídeos de redes sociales.', voiceName: 'Puck', persona: 'podcast_host', provider: 'gemini', category: 'media', avatar: '🔥' },
    { id: 'gemini-business', name: 'Líder Ejecutivo Corporativo', gender: 'male', lang: 'es-ES', accent: 'Autoritario y Convincente', description: 'Oratoria para presentaciones de negocios e inversores.', voiceName: 'Charon', persona: 'business', provider: 'gemini', category: 'media', avatar: '💼' },
    { id: 'gemini-comedy', name: 'Cómico de Monólogos', gender: 'male', lang: 'es-ES', accent: 'Sarcástico e Ingenioso', description: 'Humor picante y tiempos cómicos perfectos.', voiceName: 'Puck', persona: 'comedy', provider: 'gemini', category: 'media', avatar: '😂' },
    { id: 'gemini-ai-assistant', name: 'Asistente Virtual IA', gender: 'female', lang: 'es-ES', accent: 'Amable y Precisa', description: 'Voz digital futurista y educada para el hogar inteligente.', voiceName: 'Kore', persona: 'ai_assistant', provider: 'gemini', category: 'media', avatar: '🤖' },
    { id: 'gemini-custom', name: 'Diseñador de Voz', gender: 'male', lang: 'es-ES', accent: 'Prompt Personalizado', description: 'Define cualquier estilo de voz mediante texto.', voiceName: 'Charon', persona: 'custom', provider: 'gemini', category: 'custom', avatar: '🪄' }
  ],
  'de-DE': [
    { id: 'gemini-zephyr', name: 'Brad Pitt (Kino-Stimme)', gender: 'male', lang: 'de-DE', accent: 'Rauher Kinobariton', description: 'Charismatische, reife Stimme mit leichtem Kratzen im Ton.', voiceName: 'Charon', persona: 'pitt', provider: 'gemini', category: 'cinema', avatar: '🎬' },
    { id: 'gemini-freeman', name: 'Morgan Freeman (Erzähler)', gender: 'male', lang: 'de-DE', accent: 'Tiefer Dokumentar-Bass', description: 'Sehr tiefe, weise und autoritäre Stimme.', voiceName: 'Charon', persona: 'freeman', provider: 'gemini', category: 'cinema', avatar: '🎙️' },
    { id: 'gemini-keanu', name: 'Keanu Reeves (Action)', gender: 'male', lang: 'de-DE', accent: 'Ruhiger Magnetischer Ton', description: 'Kühler, gelassener Bariton für Krimis und Actionfilme.', voiceName: 'Charon', persona: 'keanu', provider: 'gemini', category: 'cinema', avatar: '🕶️' },
    { id: 'gemini-dicaprio', name: 'Leonardo DiCaprio', gender: 'male', lang: 'de-DE', accent: 'Dramatische Hauptrolle', description: 'Vollblutschauspieler mit emotionaler Tiefe.', voiceName: 'Puck', persona: 'dicaprio', provider: 'gemini', category: 'cinema', avatar: '🎭' },
    { id: 'gemini-statham', name: 'Jason Statham (Action)', gender: 'male', lang: 'de-DE', accent: 'Harter Kerniger Held', description: 'Tiefe, direkte Stimme für Actionhelden.', voiceName: 'Charon', persona: 'statham', provider: 'gemini', category: 'cinema', avatar: '👊' },
    { id: 'gemini-maxim', name: 'Maximilian (Nachrichtensprecher)', gender: 'male', lang: 'de-DE', accent: 'Glasklare TV-Artikulation', description: 'Standard für Nachrichten, Dokumentationen und Berichte.', voiceName: 'Charon', persona: 'maxim', provider: 'gemini', category: 'narrator', avatar: '📺' },
    { id: 'gemini-anna', name: 'Marlene (Hörbuch-Sprecherin)', gender: 'female', lang: 'de-DE', accent: 'Sanfte Warme Stimme', description: 'Ausdrucksstarke, sanfte Frauenstimme für Hörbücher.', voiceName: 'Kore', persona: 'anna', provider: 'gemini', category: 'narrator', avatar: '📖' },
    { id: 'gemini-mikhail', name: 'Michael (Doku-Sprecher)', gender: 'male', lang: 'de-DE', accent: 'Akademisch Resonanter Bass', description: 'Ruhiger, weiser Ton für Natur- und Wissenschaftsfilme.', voiceName: 'Charon', persona: 'mikhail', provider: 'gemini', category: 'narrator', avatar: '🏛️' },
    { id: 'gemini-victoria', name: 'Viktoria (TV-Moderatorin)', gender: 'female', lang: 'de-DE', accent: 'Modern und Sympathisch', description: 'Begeisternde Stimme für Lifestyle und Magazinsendungen.', voiceName: 'Kore', persona: 'victoria', provider: 'gemini', category: 'narrator', avatar: '✨' },
    { id: 'gemini-elena', name: 'Elena (Schauspielerin)', gender: 'female', lang: 'de-DE', accent: 'Tiefgründig Dramatisch', description: 'Große emotionale Bandbreite für Theater und Kino.', voiceName: 'Fenrir', persona: 'elena', provider: 'gemini', category: 'narrator', avatar: '🌹' },
    { id: 'gemini-cyberpunk', name: 'Cyberpunk Noir Detektiv', gender: 'male', lang: 'de-DE', accent: 'Rauchig Raue Stimme', description: 'Müder Ermittler in einer futuristischen Großstadt.', voiceName: 'Charon', persona: 'cyberpunk', provider: 'gemini', category: 'character', avatar: '🌃' },
    { id: 'gemini-witcher', name: 'Geralt von Riva (Hexer)', gender: 'male', lang: 'de-DE', accent: 'Kühl und Rauh', description: 'Trockener, gefährlicher Bariton für Fantasy und Gaming.', voiceName: 'Charon', persona: 'witcher', provider: 'gemini', category: 'character', avatar: '⚔️' },
    { id: 'gemini-radio-dj', name: 'Nacht-Radio DJ', gender: 'male', lang: 'de-DE', accent: 'Samtig Warmer Rundfunk', description: 'Entspannende Nähe für späte Radiostunden.', voiceName: 'Charon', persona: 'radio_dj', provider: 'gemini', category: 'character', avatar: '📻' },
    { id: 'gemini-sports', name: 'Sportkommentator', gender: 'male', lang: 'de-DE', accent: 'Explosive Dynamik', description: 'Hohes Tempo und pure Leidenschaft für Sportereignisse.', voiceName: 'Puck', persona: 'sports', provider: 'gemini', category: 'character', avatar: '⚽' },
    { id: 'gemini-fairytale', name: 'Märchenerzähler', gender: 'male', lang: 'de-DE', accent: 'Liebevoller Großvater', description: 'Herzerwärmende Stimme am Kaminfeuer.', voiceName: 'Charon', persona: 'fairytale', provider: 'gemini', category: 'character', avatar: '🧙' },
    { id: 'gemini-robot', name: 'Cyborg-Drohne (Sci-Fi AI)', gender: 'male', lang: 'de-DE', accent: 'Synthetisch Mechanisch', description: 'Futuristischer Androiden-Sound mit Computer-Präzision.', voiceName: 'Charon', persona: 'robot', provider: 'gemini', category: 'character', avatar: '🦾' },
    { id: 'gemini-meditation', name: 'Meditation / ASMR', gender: 'female', lang: 'de-DE', accent: 'Sanftes Flüstern', description: 'Beruhigende, sanfte Stimme für Entspannung und Einschlafhilfe.', voiceName: 'Kore', persona: 'meditation', provider: 'gemini', category: 'asmr', avatar: '🧘' },
    { id: 'gemini-podcast', name: 'YouTube & Podcast Creator', gender: 'male', lang: 'de-DE', accent: 'Jugendlich Mitreißend', description: 'Schnelle, sympathische Pacing für digitale Videos.', voiceName: 'Puck', persona: 'podcast_host', provider: 'gemini', category: 'media', avatar: '🔥' },
    { id: 'gemini-business', name: 'Executive Business Speaker', gender: 'male', lang: 'de-DE', accent: 'Führungspersönlichkeit', description: 'Selbstbewusste Keynote-Präsenz für Führungskräfte.', voiceName: 'Charon', persona: 'business', provider: 'gemini', category: 'media', avatar: '💼' },
    { id: 'gemini-comedy', name: 'Stand-Up Comedian', gender: 'male', lang: 'de-DE', accent: 'Witzig und Ironisch', description: 'Perfektes Timing für kabarettistische Pointen.', voiceName: 'Puck', persona: 'comedy', provider: 'gemini', category: 'media', avatar: '😂' },
    { id: 'gemini-ai-assistant', name: 'KI-Assistentin', gender: 'female', lang: 'de-DE', accent: 'Höflich und Präzise', description: 'Angenehme Begleiterin für Sprachsteuerungen.', voiceName: 'Kore', persona: 'ai_assistant', provider: 'gemini', category: 'media', avatar: '🤖' },
    { id: 'gemini-custom', name: 'Eigener Stimm-Designer', gender: 'male', lang: 'de-DE', accent: 'Benutzerdefinierter Prompt', description: 'Beschreiben Sie jede gewünschte Stimme im Text.', voiceName: 'Charon', persona: 'custom', provider: 'gemini', category: 'custom', avatar: '🪄' }
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'editor' | 'library' | 'history'>('editor');
  const [selectedLang, setSelectedLang] = useState<'ru-RU' | 'en-US' | 'uk-UA' | 'es-ES' | 'de-DE'>('ru-RU');
  
  // App parameters
  const [text, setText] = useState<string>(PRESET_TEXTS.narration.ru);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('gemini-zephyr');
  
  // Model Selector: Gemini 3.8 Flash TTS vs Gemini 3.8 Flash Lite TTS
  const [selectedModel, setSelectedModel] = useState<'gemini-3.8-flash-tts' | 'gemini-3.8-flash-lite-tts'>('gemini-3.8-flash-tts');
  
  // Voice Catalog Filters
  const [selectedVoiceCategory, setSelectedVoiceCategory] = useState<string>('all');
  const [voiceSearchQuery, setVoiceSearchQuery] = useState<string>('');
  
  // Custom Persona & Emotion
  const [customPersonaPrompt, setCustomPersonaPrompt] = useState<string>('');
  const [selectedEmotion, setSelectedEmotion] = useState<string>('neutral');
  
  // DSP Mastering controls
  const [warmBass, setWarmBass] = useState<boolean>(true);
  const [broadcastMastering, setBroadcastMastering] = useState<boolean>(true);
  
  // Dialogue Mode
  const [isDialogueMode, setIsDialogueMode] = useState<boolean>(false);
  const [speaker1Voice, setSpeaker1Voice] = useState<string>('Charon');
  const [speaker2Voice, setSpeaker2Voice] = useState<string>('Kore');
  
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(0);
  const [pauses, setPauses] = useState<'auto' | 'short' | 'long'>('auto');
  const [tokens, setTokens] = useState<number>(3420);
  
  // Playback & Speech synthesis states
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSuccessMessage, setIsSuccessMessage] = useState<string | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(-1);
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [estimatedDuration, setEstimatedDuration] = useState<number>(14);
  const [pronunciationRules, setPronunciationRules] = useState<PronunciationRule[]>([
    { original: 'Vox', replacement: 'Вокс' },
    { original: 'Studio', replacement: 'Студио' }
  ]);
  const [newRuleOrig, setNewRuleOrig] = useState('');
  const [newRuleRepl, setNewRuleRepl] = useState('');
  
  // History list
  const [history, setHistory] = useState<ProjectRecord[]>([]);

  // Browser system speech voices
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedBrowserVoice, setSelectedBrowserVoice] = useState<SpeechSynthesisVoice | null>(null);
  
  // Waveform bars simulation
  const [waveHeights, setWaveHeights] = useState<number[]>(Array.from({ length: 48 }, () => Math.floor(Math.random() * 60) + 10));

  // Audio elements, state, and Web Audio API references
  const [lastGeneratedAudioUrl, setLastGeneratedAudioUrl] = useState<string | null>(null);
  const [lastGeneratedBase64, setLastGeneratedBase64] = useState<string | null>(null);
  const [lastGeneratedBlobUrl, setLastGeneratedBlobUrl] = useState<string | null>(null);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Web Audio Context & Nodes refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const webAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const decodedAudioBufferRef = useRef<AudioBuffer | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const isWebAudioPlayingRef = useRef<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Word arrays for highlighting
  const words = text.split(/\s+/).filter(Boolean);

  // Global AudioContext builder & gesture unlocker
  const getAudioContext = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!audioContextRef.current) {
        const ctx = new AudioCtx();
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(isMuted ? 0 : volume, ctx.currentTime);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;

        gain.connect(analyser);
        analyser.connect(ctx.destination);

        audioContextRef.current = ctx;
        gainNodeRef.current = gain;
        analyserNodeRef.current = analyser;
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      return audioContextRef.current;
    } catch (e) {
      console.warn("AudioContext initialization warning:", e);
      return null;
    }
  };

  // Immediate sound output test to verify browser & speakers
  const playSpeakerTest = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const testGain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, now + 0.12); // G5

      testGain.gain.setValueAtTime(0, now);
      testGain.gain.linearRampToValueAtTime(0.25, now + 0.04);
      testGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc1.connect(testGain);
      osc2.connect(testGain);
      testGain.connect(gainNodeRef.current || ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.15);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);

      setIsSuccessMessage("🔊 Проверка динамиков: звук воспроизводится!");
      setTimeout(() => setIsSuccessMessage(null), 3000);
    } catch (e) {
      console.error("Speaker test error:", e);
    }
  };

  // Quick audition / preview for individual voice cards
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);

  const handlePreviewVoice = (e: React.MouseEvent, voice: VoiceOption) => {
    e.stopPropagation();
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
    handleStopSpeaking();
    setPreviewingVoiceId(voice.id);

    // If it is a browser system voice, play greeting via SpeechSynthesis
    if (voice.provider === 'browser') {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const demoPhrase = selectedLang === 'en-US' ? `Hello! This is ${voice.name}.` :
                           selectedLang === 'uk-UA' ? `Привіт! Це диктор ${voice.name}.` :
                           selectedLang === 'es-ES' ? `¡Hola! Esta es la voz de ${voice.name}.` :
                           selectedLang === 'de-DE' ? `Hallo! Dies ist die Stimme ${voice.name}.` :
                           `Привет! Это диктор ${voice.name}.`;
        const utt = new SpeechSynthesisUtterance(demoPhrase);
        if (voice.id.startsWith('system-')) {
          const sysName = voice.id.replace('system-', '');
          const match = browserVoices.find(bv => bv.name === sysName);
          if (match) utt.voice = match;
        }
        utt.rate = 1.0;
        utt.onend = () => setPreviewingVoiceId(null);
        utt.onerror = () => setPreviewingVoiceId(null);
        window.speechSynthesis.speak(utt);
      } else {
        setPreviewingVoiceId(null);
      }
      return;
    }

    // For Gemini AI Voice, generate short 2-3 word preview
    const sampleText = selectedLang === 'en-US' ? `Voiceover test with ${voice.name}.` :
                       selectedLang === 'uk-UA' ? `Тест озвучення: ${voice.name}.` :
                       selectedLang === 'es-ES' ? `Prueba de locución: ${voice.name}.` :
                       selectedLang === 'de-DE' ? `Sprachprobe mit ${voice.name}.` :
                       `Привет! Говорит ${voice.name}.`;

    fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: sampleText,
        voice: voice.voiceName || 'Charon',
        persona: voice.persona || 'pitt',
        model: selectedModel,
        emotion: selectedEmotion,
        speed: 1.0,
        pitch: 0,
        warmBass: warmBass,
        broadcastMastering: broadcastMastering
      })
    })
    .then(r => {
      if (!r.ok) throw new Error("Preview generation failed");
      return r.json();
    })
    .then(data => {
      setPreviewingVoiceId(null);
      if (data.audioBase64 || data.audioUrl) {
        playAudioData(data.audioUrl, data.audioBase64);
      }
    })
    .catch(err => {
      console.warn("Preview error:", err);
      setPreviewingVoiceId(null);
      playSpeakerTest();
    });
  };

  // Sync volume / mute changes directly to GainNode and Audio element
  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setValueAtTime(isMuted ? 0 : volume, audioContextRef.current.currentTime);
    }
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Unlock AudioContext on first user interaction anywhere in the window
  useEffect(() => {
    const unlock = () => {
      getAudioContext();
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Initialize Speech synthesis voices
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const voicesList = window.speechSynthesis.getVoices();
        setBrowserVoices(voicesList);
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    const saved = localStorage.getItem('vox_studio_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  // Update Estimated Duration based on text length and speed
  useEffect(() => {
    const wordCount = words.length;
    const calculatedDuration = Math.max(1, Math.round((wordCount / (130 * speed)) * 60));
    setEstimatedDuration(calculatedDuration);
  }, [text, speed]);

  // Live Audio Oscilloscope & Playback Progress Tracker
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      setWaveHeights(Array.from({ length: 48 }, () => Math.floor(Math.random() * 22) + 8));
      return;
    }

    const analyser = analyserNodeRef.current;
    const ctx = audioContextRef.current;
    const buf = decodedAudioBufferRef.current;
    const freqData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const isPitchActive = pitch !== 0;
    const effectiveRate = Math.max(0.25, Math.min(4.0, isPitchActive ? speed * (1.0 + (pitch / 100)) : speed));

    const renderLoop = () => {
      // 1. Live waveform from audio analyser
      if (analyser && freqData) {
        analyser.getByteFrequencyData(freqData);
        setWaveHeights(prev => {
          return prev.map((_, i) => {
            const dataIdx = Math.floor((i / prev.length) * freqData.length);
            const val = freqData[dataIdx] || 0;
            return Math.max(12, Math.floor((val / 255) * 88));
          });
        });
      }

      // 2. Exact playback time and progress percentage
      if (ctx && buf && isWebAudioPlayingRef.current) {
        const totalDuration = buf.duration / effectiveRate;
        const elapsed = Math.max(0, (ctx.currentTime - playbackStartTimeRef.current) * effectiveRate);
        const clampedElapsed = Math.min(totalDuration, elapsed);
        const pct = Math.min(100, (clampedElapsed / totalDuration) * 100);

        setCurrentProgress(pct);
        setTimeSpent(Math.floor(clampedElapsed));

        // Highlight spoken words progressively
        const ratio = clampedElapsed / totalDuration;
        const activeIdx = Math.floor(ratio * words.length);
        setCurrentWordIndex(Math.min(words.length - 1, Math.max(0, activeIdx)));
      }

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isPlaying, speed, pitch, words.length]);

  // Apply pronunciation rules to text
  const applyRules = (rawText: string): string => {
    let cleaned = rawText;
    pronunciationRules.forEach(rule => {
      if (rule.original.trim()) {
        const regex = new RegExp(`\\b${rule.original}\\b`, 'gi');
        cleaned = cleaned.replace(regex, rule.replacement);
      }
    });

    if (pauses === 'short') {
      cleaned = cleaned.replace(/[,;:]/g, ' ...');
    } else if (pauses === 'long') {
      cleaned = cleaned.replace(/[,;:.]/g, ' .... [pause]');
    }
    return cleaned;
  };

  // Insert expressiveness tag directly at cursor position in textarea
  const insertTagAtCursor = (tag: string) => {
    if (!textareaRef.current) {
      setText(prev => prev + ' ' + tag);
      return;
    }

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;

    const updated = currentVal.substring(0, start) + tag + currentVal.substring(end);
    setText(updated);

    // Reposition cursor right after inserted tag
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 10);
  };

  const handleStartSpeaking = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert('Интерфейс синтеза речи не поддерживается в данном браузере.');
      return;
    }

    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentWordIndex(-1);

    setTimeout(() => {
      const processedText = applyRules(text);
      if (!processedText.trim()) return;

      const utterance = new SpeechSynthesisUtterance(processedText);
      if (selectedBrowserVoice) {
        utterance.voice = selectedBrowserVoice;
      }
      utterance.rate = speed;
      utterance.pitch = Math.max(0.5, Math.min(2.0, 1.0 + (pitch / 40)));

      utterance.onstart = () => {
        setIsPlaying(true);
        setTimeSpent(0);
        setCurrentProgress(0);
      };

      utterance.onend = () => {
        handleStopSpeaking();
      };

      utterance.onerror = (e) => {
        console.error('TTS synthesis error:', e);
        handleStopSpeaking();
      };

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          const charIndex = event.charIndex;
          let accumulatedCharCount = 0;
          let matchedIndex = 0;
          for (let i = 0; i < words.length; i++) {
            accumulatedCharCount += words[i].length + 1;
            if (accumulatedCharCount >= charIndex) {
              matchedIndex = i;
              break;
            }
          }
          setCurrentWordIndex(matchedIndex);
        }
      };

      speechUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }, 50);
  };

  const handleStopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (webAudioSourceRef.current) {
      try {
        webAudioSourceRef.current.stop();
        webAudioSourceRef.current.disconnect();
      } catch (e) {}
      webAudioSourceRef.current = null;
    }
    isWebAudioPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentWordIndex(-1);
    setCurrentProgress(0);
    setTimeSpent(0);
  };

  const playDecodedAudio = (audioBuf: AudioBuffer, startOffset = 0) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    if (webAudioSourceRef.current) {
      try {
        webAudioSourceRef.current.stop();
        webAudioSourceRef.current.disconnect();
      } catch (e) {}
      webAudioSourceRef.current = null;
    }

    try {
      const source = ctx.createBufferSource();
      source.buffer = audioBuf;

      const isPitchActive = pitch !== 0;
      const effectiveRate = isPitchActive ? speed * (1.0 + (pitch / 100)) : speed;
      const clampedRate = Math.max(0.25, Math.min(4.0, effectiveRate));
      source.playbackRate.value = clampedRate;

      source.connect(gainNodeRef.current || ctx.destination);

      const safeOffset = Math.max(0, Math.min(startOffset, audioBuf.duration - 0.05));
      source.start(0, safeOffset);

      playbackStartTimeRef.current = ctx.currentTime - (safeOffset / clampedRate);
      webAudioSourceRef.current = source;
      isWebAudioPlayingRef.current = true;

      setIsPlaying(true);
      setIsAutoplayBlocked(false);

      const totalDuration = audioBuf.duration / clampedRate;
      setEstimatedDuration(Math.ceil(totalDuration));

      source.onended = () => {
        if (webAudioSourceRef.current === source) {
          isWebAudioPlayingRef.current = false;
          setIsPlaying(false);
          setCurrentWordIndex(-1);
          setCurrentProgress(100);
          setTimeSpent(Math.ceil(totalDuration));
          webAudioSourceRef.current = null;
        }
      };
    } catch (err) {
      console.error("Web Audio source start error:", err);
      setIsPlaying(false);
      setIsAutoplayBlocked(true);
    }
  };

  const playAudioData = async (url: string, base64?: string, startOffset = 0) => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
    handleStopSpeaking();

    // 1. If base64 is available, decode directly into an AudioBuffer
    if (base64 && ctx) {
      try {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const blob = new Blob([bytes], { type: 'audio/wav' });
        const blobUrl = URL.createObjectURL(blob);
        setLastGeneratedBlobUrl(blobUrl);

        // Decode using sliced array buffer to avoid detach issues
        const decoded = await ctx.decodeAudioData(bytes.buffer.slice(0));
        decodedAudioBufferRef.current = decoded;
        playDecodedAudio(decoded, startOffset);
        return;
      } catch (e) {
        console.warn("Base64 Web Audio decoding error:", e);
      }
    }

    // 2. If cached decoded buffer already exists in memory, play it immediately
    if (decodedAudioBufferRef.current) {
      playDecodedAudio(decodedAudioBufferRef.current, startOffset);
      return;
    }

    // 3. Fallback: Fetch URL as ArrayBuffer and decode with Web Audio
    if (url && ctx) {
      try {
        const resp = await fetch(url);
        const arrayBuf = await resp.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuf);
        decodedAudioBufferRef.current = decoded;
        playDecodedAudio(decoded, startOffset);
        return;
      } catch (e) {
        console.warn("URL audio decode error:", e);
      }
    }

    // 4. Fallback to HTML5 audio element
    if (audioRef.current && (url || lastGeneratedBlobUrl)) {
      const audio = audioRef.current;
      audio.src = lastGeneratedBlobUrl || url;
      audio.volume = isMuted ? 0 : volume;
      audio.playbackRate = speed;
      audio.play().then(() => {
        setIsPlaying(true);
        setIsAutoplayBlocked(false);
      }).catch(err => {
        console.warn("HTML5 audio playback blocked by browser:", err);
        setIsAutoplayBlocked(true);
        setIsPlaying(false);
      });
    }
  };

  const togglePlayback = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }

    if (isPlaying) {
      handleStopSpeaking();
    } else {
      const voiceProf = activeVoices.find(v => v.id === selectedVoiceId) || activeVoices[0];
      const isGemini = voiceProf && (voiceProf.id.startsWith('gemini-') || (voiceProf as any).provider === 'gemini');

      if (isGemini) {
        if (decodedAudioBufferRef.current) {
          playDecodedAudio(decodedAudioBufferRef.current, 0);
        } else if (lastGeneratedBase64 || lastGeneratedBlobUrl || lastGeneratedAudioUrl) {
          playAudioData(lastGeneratedBlobUrl || lastGeneratedAudioUrl!, lastGeneratedBase64 || undefined);
        } else {
          handleGenerateAudio();
        }
      } else {
        handleStartSpeaking();
      }
    }
  };

  const handleGenerateAudio = async () => {
    if (!text.trim()) return;

    // Immediately resume / unlock AudioContext during the user's direct click event
    getAudioContext();

    setIsGenerating(true);
    setIsAutoplayBlocked(false);
    handleStopSpeaking();

    try {
      const voiceProf = activeVoices.find(v => v.id === selectedVoiceId) || activeVoices[0];
      const isGemini = voiceProf && (voiceProf.id.startsWith('gemini-') || (voiceProf as any).provider === 'gemini');
      
      const realVoiceParam = isGemini ? (voiceProf.voiceName || 'Charon') : 'Charon';
      const realPersonaParam = isGemini ? (voiceProf.persona || 'pitt') : 'pitt';

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: applyRules(text),
          voice: realVoiceParam,
          persona: realPersonaParam,
          customPersonaPrompt: realPersonaParam === 'custom' ? customPersonaPrompt : undefined,
          model: selectedModel,
          emotion: selectedEmotion,
          id: `vox-${Date.now()}`,
          speed: speed,
          pitch: pitch,
          pauses: pauses,
          warmBass: warmBass,
          broadcastMastering: broadcastMastering,
          dialogueMode: isDialogueMode,
          dialogueSpeakers: isDialogueMode ? {
            speaker1: { name: "Алекс", voice: speaker1Voice },
            speaker2: { name: "Сэм", voice: speaker2Voice }
          } : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ошибка генерации голоса ИИ");
      }

      const responseData = await response.json();
      
      const chargeAmount = Math.max(10, Math.floor(text.length * 0.3));
      setTokens(prev => Math.max(0, prev - chargeAmount));

      const newRecord: ProjectRecord = {
        id: responseData.id,
        text: text,
        voiceId: selectedVoiceId,
        voiceName: voiceProf.name,
        speed: speed,
        pitch: pitch,
        pauses: pauses,
        duration: `0:${estimatedDuration < 10 ? '0' + estimatedDuration : estimatedDuration}`,
        timestamp: new Date().toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        wordCount: words.length,
        audioUrl: responseData.audioUrl,
        modelUsed: selectedModel
      };

      const updatedHistory = [newRecord, ...history];
      setHistory(updatedHistory);
      localStorage.setItem('vox_studio_history', JSON.stringify(updatedHistory));

      setLastGeneratedAudioUrl(responseData.audioUrl);
      setLastGeneratedBase64(responseData.audioBase64 || null);

      setIsSuccessMessage(`Голос ИИ успешно сгенерирован (${selectedModel === 'gemini-3.8-flash-tts' ? 'Gemini 3.8 Flash' : 'Gemini 3.8 Flash Lite'})!`);
      setTimeout(() => {
        setIsSuccessMessage(null);
      }, 4000);

      playAudioData(responseData.audioUrl, responseData.audioBase64);

    } catch (err: any) {
      console.error("Synthesizer error:", err);
      setIsSuccessMessage(`Ошибка ИИ: ${err.message || 'нет подключения к серверу'}`);
      setTimeout(() => {
        setIsSuccessMessage(null);
      }, 5000);
    } finally {
      setIsGenerating(false);
    }
  };

  const changeLanguage = (lang: 'ru-RU' | 'en-US' | 'uk-UA' | 'es-ES' | 'de-DE') => {
    setSelectedLang(lang);
    
    if (lang === 'ru-RU') {
      setText(PRESET_TEXTS.narration.ru);
    } else if (lang === 'uk-UA') {
      setText(PRESET_TEXTS.narration.uk);
    } else if (lang === 'es-ES') {
      setText(PRESET_TEXTS.narration.es);
    } else if (lang === 'de-DE') {
      setText(PRESET_TEXTS.narration.de);
    } else {
      setText(PRESET_TEXTS.narration.en);
    }

    const premiumVoicesForLang = GEMINI_VOICES[lang] || [];
    const matchedPremium = premiumVoicesForLang[0];
    
    if (matchedPremium) {
      setSelectedVoiceId(matchedPremium.id);
    } else {
      setSelectedVoiceId('gemini-zephyr');
    }

    setLastGeneratedAudioUrl(null);
    handleStopSpeaking();
  };

  const applyPreset = (key: keyof typeof PRESET_TEXTS) => {
    let textToSet = '';
    if (selectedLang === 'ru-RU') textToSet = PRESET_TEXTS[key].ru;
    else if (selectedLang === 'uk-UA') textToSet = PRESET_TEXTS[key].uk;
    else if (selectedLang === 'es-ES') textToSet = PRESET_TEXTS[key].es;
    else if (selectedLang === 'de-DE') textToSet = PRESET_TEXTS[key].de;
    else textToSet = PRESET_TEXTS[key].en;
    
    if (key === 'dialogue') {
      setIsDialogueMode(true);
    } else {
      setIsDialogueMode(false);
    }

    setText(textToSet);
    handleStopSpeaking();
  };

  const addPronunciationRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRuleOrig.trim() && newRuleRepl.trim()) {
      setPronunciationRules(prev => [
        ...prev, 
        { original: newRuleOrig.trim(), replacement: newRuleRepl.trim() }
      ]);
      setNewRuleOrig('');
      setNewRuleRepl('');
    }
  };

  const removeRule = (index: number) => {
    setPronunciationRules(prev => prev.filter((_, i) => i !== index));
  };

  const clearHistory = () => {
    if (confirm('Вы уверены, что хотите очистить всю историю проектов?')) {
      setHistory([]);
      localStorage.removeItem('vox_studio_history');
    }
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('vox_studio_history', JSON.stringify(updated));
  };

  // Download raw audio file
  const handleDownloadAudioFile = async (url: string, filename: string) => {
    try {
      setIsGenerating(true);
      setIsSuccessMessage("Загрузка студийного аудиофайла 48 кГц...");
      
      const urlParts = url.split('/');
      const urlFilename = urlParts[urlParts.length - 1] || "audio.wav";
      const cleanFilename = urlFilename.split('?')[0];
      
      const response = await fetch(`/api/audio-base64/${cleanFilename}`);
      if (!response.ok) {
        throw new Error(`Ошибка ответа сервера: статус ${response.status}`);
      }
      
      const resData = await response.json();
      if (!resData.success || !resData.base64) {
        throw new Error(resData.error || "Не удалось получить звуковые данные с сервера.");
      }
      
      const binaryString = window.atob(resData.base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: "audio/wav" });
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      
      setIsSuccessMessage("Студийный WAV файл сохранен на диск!");
      setTimeout(() => setIsSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error("Audio download error:", err);
      setIsSuccessMessage(`Ошибка скачивания: ${err.message || 'не удалось загрузить аудиофайл'}`);
      setTimeout(() => setIsSuccessMessage(null), 5000);
    } finally {
      setIsGenerating(false);
    }
  };

  // Download Subtitles (SRT or VTT) with timed segments
  const handleDownloadSubtitles = async (format: 'srt' | 'vtt') => {
    try {
      setIsGenerating(true);
      const response = await fetch('/api/subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          durationSeconds: estimatedDuration,
          format
        })
      });

      if (!response.ok) throw new Error("Не удалось сгенерировать субтитры");
      const data = await response.json();

      const blob = new Blob([data.content], { type: format === 'srt' ? 'text/plain' : 'text/vtt' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vox-subtitles-${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsSuccessMessage(`Файл субтитров .${format.toUpperCase()} успешно скачан!`);
      setTimeout(() => setIsSuccessMessage(null), 3000);
    } catch (e: any) {
      setIsSuccessMessage(`Ошибка: ${e.message}`);
      setTimeout(() => setIsSuccessMessage(null), 3000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadText = () => {
    const voiceProf = activeVoices.find(v => v.id === selectedVoiceId) || activeVoices[0];
    
    const fileContent = `Vox Studio Voiceover Project Configuration
----------------------------------
Model: ${selectedModel}
Voice: ${voiceProf.name} (${voiceProf.accent})
Persona: ${voiceProf.persona || 'standard'}
Emotion: ${selectedEmotion}
Warm Tube Bass: ${warmBass ? 'Enabled' : 'Disabled'}
Broadcast Punch: ${broadcastMastering ? 'Enabled' : 'Disabled'}
Rate / Speed: ${speed}x
Pitch: ${pitch}%
Pause Mode: ${pauses}
Character Length: ${text.length}

----------------------------------
SPEECH SCRIPT:
${text}
`;
    const element = document.createElement('a');
    const file = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `vox-script-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const allVoicesForLang = useMemo(() => {
    const langPrefix = selectedLang.split('-')[0].toLowerCase();
    const matchedBrowserVoices = browserVoices.filter(v => 
      v.lang.toLowerCase().startsWith(langPrefix) || 
      v.lang.toLowerCase().includes(langPrefix)
    );

    const premiumList = GEMINI_VOICES[selectedLang] || GEMINI_VOICES['ru-RU'] || [];

    let deviceList: VoiceOption[] = [];
    if (matchedBrowserVoices.length > 0) {
      deviceList = matchedBrowserVoices.map((bv, idx) => {
        const isFemale = /female|zira|anna|elena|susan|karen|hazel|emily|lesya|tetyana|milena/i.test(bv.name);
        let friendlyName = bv.name
          .replace(/Microsoft|Google|Apple|SpeechSynthesis/g, '')
          .replace(/Desktop/g, '')
          .replace(/Natural/g, '')
          .replace(/-/g, ' ')
          .trim();
        if (!friendlyName) friendlyName = `Голос устройства ${idx + 1}`;
        return {
          id: `system-${bv.name}`,
          name: friendlyName,
          gender: isFemale ? 'female' as const : 'male' as const,
          lang: selectedLang,
          accent: `Системный (${bv.lang})`,
          description: `Голос устройства: ${bv.name}. Автономный синтез ОС.`,
          category: 'system' as const,
          avatar: '💻',
          provider: 'browser' as const
        };
      });
    } else {
      deviceList = getVoicesForLanguage(selectedLang);
    }

    return [...premiumList, ...deviceList];
  }, [selectedLang, browserVoices]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: allVoicesForLang.length,
      cinema: 0,
      narrator: 0,
      character: 0,
      asmr: 0,
      media: 0,
      system: 0
    };
    allVoicesForLang.forEach(v => {
      if (v.provider === 'browser' || v.category === 'system') {
        counts.system = (counts.system || 0) + 1;
      } else if (v.category && counts[v.category] !== undefined) {
        counts[v.category]++;
      }
    });
    return counts;
  }, [allVoicesForLang]);

  const activeVoices = useMemo(() => {
    return allVoicesForLang.filter(v => {
      if (selectedVoiceCategory !== 'all') {
        if (selectedVoiceCategory === 'system') {
          if (v.provider !== 'browser' && v.category !== 'system') return false;
        } else if (v.category !== selectedVoiceCategory) {
          return false;
        }
      }
      if (voiceSearchQuery.trim()) {
        const q = voiceSearchQuery.toLowerCase();
        return (
          v.name.toLowerCase().includes(q) ||
          v.accent.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allVoicesForLang, selectedVoiceCategory, voiceSearchQuery]);

  const selectedVoiceProfile = allVoicesForLang.find(v => v.id === selectedVoiceId) || allVoicesForLang[0];

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0a0c] text-slate-300 font-sans overflow-hidden select-none">
      
      {/* Top Navigation Bar */}
      <nav className="flex items-center justify-between px-8 h-16 border-b border-white/5 bg-[#0f0f12] flex-shrink-0" id="vox-navbar">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/35 transition-transform hover:scale-105">
              <Mic size={20} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-white tracking-widest text-[15px] leading-tight font-mono">VOX STUDIO</span>
              <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">Gemini 3.8 Audio Engine</span>
            </div>
          </div>
          
          {/* Main Navigation Tabs */}
          <div className="flex gap-1.5 text-sm font-medium bg-[#131318] p-1 rounded-lg border border-white/5">
            <button 
              id="tab-editor"
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-1.5 rounded-md transition-all duration-200 cursor-pointer ${activeTab === 'editor' ? 'bg-[#1b1b22] text-white shadow-sm border border-white/5' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <div className="flex items-center gap-2">
                <FileText size={15} />
                Редактор
              </div>
            </button>
            <button 
              id="tab-library"
              onClick={() => setActiveTab('library')}
              className={`px-4 py-1.5 rounded-md transition-all duration-200 cursor-pointer ${activeTab === 'library' ? 'bg-[#1b1b22] text-white shadow-sm border border-white/5' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <div className="flex items-center gap-2">
                <Languages size={15} />
                Голоса & Персоны
              </div>
            </button>
            <button 
              id="tab-history"
              onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 rounded-md transition-all duration-200 cursor-pointer ${activeTab === 'history' ? 'bg-[#1b1b22] text-white shadow-sm border border-white/5' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <div className="flex items-center gap-2">
                <History size={15} />
                История
                {history.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-indigo-500/30 text-indigo-300 text-[10px] font-bold rounded-full">
                    {history.length}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Global Settings & Model Switcher in Header */}
        <div className="flex items-center gap-4">
          
          {/* TTS Model Badge Switcher */}
          <div className="flex items-center bg-[#131318] p-1 rounded-lg border border-white/5 gap-1">
            <Cpu size={14} className="text-indigo-400 ml-1.5 mr-0.5" />
            <button 
              onClick={() => setSelectedModel('gemini-3.8-flash-tts')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all cursor-pointer flex items-center gap-1 ${
                selectedModel === 'gemini-3.8-flash-tts' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Флагман: Voice Design, дыхание, эмоции и студийные паузы"
            >
              <span>Flash 3.8 TTS</span>
              <span className="text-[9px] px-1 bg-amber-500/20 text-amber-300 rounded font-mono">PRO</span>
            </button>
            <button 
              onClick={() => setSelectedModel('gemini-3.8-flash-lite-tts')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${
                selectedModel === 'gemini-3.8-flash-lite-tts' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Быстрый синтез: мгновенный отклик, оптимизированная скорость"
            >
              Flash Lite 3.8
            </button>
          </div>

          {/* Language Switch */}
          <div className="flex bg-[#131318] p-0.5 rounded-lg border border-white/5 gap-0.5 flex-wrap">
            <button 
              onClick={() => changeLanguage('ru-RU')}
              className={`px-2 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer ${selectedLang === 'ru-RU' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Русский"
            >
              RU
            </button>
            <button 
              onClick={() => changeLanguage('en-US')}
              className={`px-2 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer ${selectedLang === 'en-US' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="English"
            >
              EN
            </button>
            <button 
              onClick={() => changeLanguage('uk-UA')}
              className={`px-2 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer ${selectedLang === 'uk-UA' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Українська"
            >
              UA
            </button>
            <button 
              onClick={() => changeLanguage('es-ES')}
              className={`px-2 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer ${selectedLang === 'es-ES' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Español"
            >
              ES
            </button>
            <button 
              onClick={() => changeLanguage('de-DE')}
              className={`px-2 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer ${selectedLang === 'de-DE' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Deutsch"
            >
              DE
            </button>
          </div>

          {/* Speaker / Device Sound Test button */}
          <button 
            type="button"
            onClick={playSpeakerTest}
            title="Проверить воспроизведение звука на вашем устройстве (тестовый тон)"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171722] hover:bg-indigo-600/30 hover:border-indigo-500/40 text-indigo-300 hover:text-white rounded-lg border border-white/10 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Volume2 size={14} className="text-indigo-400" />
            <span>Тест звука</span>
          </button>

          {/* Tokens status counter */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-full text-xs font-mono text-indigo-400 border border-indigo-500/15">
            <Sparkles size={13} className="text-indigo-400 animate-pulse" />
            <span className="font-semibold">{tokens.toLocaleString('ru-RU')} токенов</span>
          </div>
        </div>
      </nav>

      {/* Floating Success Alert Toast */}
      {isSuccessMessage && (
        <div id="toast-success" className="fixed top-20 right-8 z-50 flex items-center gap-3 px-5 py-3 bg-[#0f1d16] text-emerald-400 rounded-xl border border-emerald-500/30 shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-4">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Check size={12} strokeWidth={3} />
          </div>
          <span className="text-xs font-medium">{isSuccessMessage}</span>
        </div>
      )}

      {/* App Main Area */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* TAB 1: Main Synth Editor */}
        {activeTab === 'editor' && (
          <div className="flex-1 flex overflow-hidden">
            
            {/* Editor Workspace Left */}
            <section className="flex-1 flex flex-col p-8 overflow-y-auto" id="workspace-editor">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xs uppercase tracking-widest text-slate-500 font-bold">Текст для озвучки</h2>
                  <span className="px-2 py-0.5 text-[10px] bg-indigo-500/10 text-indigo-300 font-mono rounded border border-indigo-500/20">
                    {selectedModel === 'gemini-3.8-flash-tts' ? 'Gemini 3.8 Flash (Студийный)' : 'Gemini 3.8 Flash Lite (Быстрый)'}
                  </span>
                  {isDialogueMode && (
                    <span className="px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-300 font-bold rounded border border-purple-500/30 flex items-center gap-1">
                      <MessageSquare size={10} />
                      Режим диалога (2 диктора)
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-3 text-xs">
                  {/* Preset quick picker */}
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <BookOpen size={13} />
                    <span className="text-slate-500 text-[11px]">Шаблоны:</span>
                    <button onClick={() => applyPreset('narration')} className="hover:text-white transition-colors underline decoration-dotted cursor-pointer">Книга</button>
                    <span className="text-white/10">•</span>
                    <button onClick={() => applyPreset('commercial')} className="hover:text-white transition-colors underline decoration-dotted cursor-pointer">Реклама</button>
                    <span className="text-white/10">•</span>
                    <button onClick={() => applyPreset('dialogue')} className="hover:text-white transition-colors underline decoration-dotted cursor-pointer font-semibold text-purple-400">Диалог (Сценарий)</button>
                  </div>
                  <span className="text-white/10">|</span>
                  <div className="text-slate-500 font-mono text-[11px]">
                    <span className={text.length > 4500 ? 'text-red-400' : 'text-slate-400'}>{text.length}</span> / 5000
                  </div>
                </div>
              </div>

              {/* Expressive Vocal Bursts & Tag Inserter Toolbar */}
              <div className="mb-2.5 p-2 bg-[#121217] rounded-lg border border-white/5 flex items-center justify-between gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] uppercase font-bold text-slate-500 mr-1 flex items-center gap-1">
                    <Wand2 size={11} className="text-indigo-400" />
                    Вставка эффектов:
                  </span>
                  <button 
                    onClick={() => insertTagAtCursor('<breath>')} 
                    className="px-2 py-0.5 bg-[#1b1b24] hover:bg-indigo-600 hover:text-white text-indigo-300 rounded border border-indigo-500/20 transition-all font-mono text-[11px] cursor-pointer"
                    title="Вставить естественный вдох перед фразой"
                  >
                    + &lt;breath&gt; (вдох)
                  </button>
                  <button 
                    onClick={() => insertTagAtCursor('<laugh>')} 
                    className="px-2 py-0.5 bg-[#1b1b24] hover:bg-indigo-600 hover:text-white text-indigo-300 rounded border border-indigo-500/20 transition-all font-mono text-[11px] cursor-pointer"
                    title="Вставить смешок"
                  >
                    + &lt;laugh&gt; (смех)
                  </button>
                  <button 
                    onClick={() => insertTagAtCursor('<gasp>')} 
                    className="px-2 py-0.5 bg-[#1b1b24] hover:bg-indigo-600 hover:text-white text-indigo-300 rounded border border-indigo-500/20 transition-all font-mono text-[11px] cursor-pointer"
                    title="Вставить вздох удивления"
                  >
                    + &lt;gasp&gt; (вздох)
                  </button>
                  <button 
                    onClick={() => insertTagAtCursor('|yeah|')} 
                    className="px-2 py-0.5 bg-[#1b1b24] hover:bg-indigo-600 hover:text-white text-indigo-300 rounded border border-indigo-500/20 transition-all font-mono text-[11px] cursor-pointer"
                    title="Вставить утвердительное 'да'"
                  >
                    + |yeah|
                  </button>
                  <button 
                    onClick={() => insertTagAtCursor('|mhm|')} 
                    className="px-2 py-0.5 bg-[#1b1b24] hover:bg-indigo-600 hover:text-white text-indigo-300 rounded border border-indigo-500/20 transition-all font-mono text-[11px] cursor-pointer"
                    title="Вставить утвердительное 'угу'"
                  >
                    + |mhm|
                  </button>
                  <button 
                    onClick={() => insertTagAtCursor(' ... [пауза 1с] ... ')} 
                    className="px-2 py-0.5 bg-[#1b1b24] hover:bg-indigo-600 hover:text-white text-slate-300 rounded border border-white/5 transition-all text-[11px] cursor-pointer"
                    title="Вставить выразительную паузу"
                  >
                    + [пауза]
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setIsDialogueMode(!isDialogueMode)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-all cursor-pointer flex items-center gap-1 ${
                      isDialogueMode 
                        ? 'bg-purple-600 text-white border-purple-500' 
                        : 'bg-[#181820] text-slate-400 border-white/5 hover:text-white'
                    }`}
                    title="Включить режим диалога с разделением по ролям"
                  >
                    <MessageSquare size={12} />
                    {isDialogueMode ? 'Диалог ВКЛ' : 'Диалог 2 диктора'}
                  </button>
                </div>
              </div>

              {/* Text-input with absolute premium highlighting for synthesized utterances */}
              <div className="flex-1 relative min-h-[220px]">
                {isPlaying && currentWordIndex !== -1 ? (
                  <div className="absolute inset-0 w-full h-full bg-[#141418] rounded-xl border border-indigo-500/30 p-6 text-xl leading-relaxed text-slate-400 overflow-y-auto whitespace-pre-wrap font-sans">
                    {words.map((word, idx) => {
                      const isReading = idx === currentWordIndex;
                      return (
                        <span 
                          key={idx} 
                          className={`transition-colors duration-150 inline-block mr-1.5 ${isReading ? 'bg-indigo-600 text-white font-bold px-1 rounded shadow-sm scale-105' : 'text-slate-400'}`}
                        >
                          {word}
                        </span>
                      );
                    })}
                    {words.length === 0 && <span className="text-slate-600">Ожидание текста...</span>}
                  </div>
                ) : (
                  <textarea 
                    ref={textareaRef}
                    id="speech-textarea"
                    value={text}
                    onChange={(e) => {
                      if (e.target.value.length <= 5000) {
                        setText(e.target.value);
                        handleStopSpeaking();
                      }
                    }}
                    className="w-full h-full bg-[#141418] rounded-xl border border-white/5 p-6 text-xl leading-relaxed text-slate-200 outline-none focus:border-indigo-500/30 resize-none transition-all placeholder:text-slate-700 custom-scrollbar" 
                    placeholder="Введите текст для озвучки..."
                  />
                )}
                
                {/* Overlay buttons inside textarea corner */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <button 
                    onClick={() => { setText(''); handleStopSpeaking(); }}
                    title="Очистить редактор"
                    className="p-2 bg-[#1a1a22] hover:bg-[#252530] text-slate-500 hover:text-slate-300 rounded-lg border border-white/5 transition-all cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Advanced Pronunciation Dictionary Block */}
              <div className="mt-5 p-4 bg-[#101014] rounded-xl border border-white/5 flex flex-col gap-3" id="dictionary-section">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Layers size={14} className="text-slate-400" />
                    <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">Спец-словарь замен (транскрипция)</h3>
                  </div>
                  <span className="text-[10px] text-slate-600">Настройка звучания сокращений</span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  {pronunciationRules.map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-1 px-2.5 py-1 bg-[#16161e] text-slate-300 rounded-lg border border-white/10 group">
                      <span className="font-mono text-indigo-300">{rule.original}</span>
                      <span className="text-slate-600">➔</span>
                      <span className="font-semibold text-slate-200">{rule.replacement}</span>
                      <button 
                        onClick={() => removeRule(idx)} 
                        className="ml-1 text-slate-600 hover:text-red-400 font-bold text-[10px] select-none cursor-pointer"
                        title="Удалить правило"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {pronunciationRules.length === 0 && (
                    <p className="text-xs text-slate-600 italic">Словарь пуст.</p>
                  )}
                </div>

                {/* Dictionary adder form */}
                <form onSubmit={addPronunciationRule} className="flex gap-2 text-xs mt-1">
                  <input 
                    type="text" 
                    placeholder="Пример: AI" 
                    value={newRuleOrig}
                    onChange={(e) => setNewRuleOrig(e.target.value)}
                    className="flex-1 bg-[#15151b] rounded-lg border border-white/5 px-3 py-1.5 outline-none focus:border-indigo-600/50 text-slate-300"
                  />
                  <input 
                    type="text" 
                    placeholder="Прочтение: ЭйАй" 
                    value={newRuleRepl}
                    onChange={(e) => setNewRuleRepl(e.target.value)}
                    className="flex-1 bg-[#15151b] rounded-lg border border-white/5 px-3 py-1.5 outline-none focus:border-indigo-600/50 text-slate-300"
                  />
                  <button 
                    type="submit"
                    className="px-4 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> Добавить
                  </button>
                </form>
              </div>
            </section>

            {/* Sidebar Controls Panel Right */}
            <aside className="w-88 bg-[#0f0f12] border-l border-white/5 p-6 flex flex-col gap-5 overflow-y-auto flex-shrink-0" id="aside-controls">
              
              {/* Voice Personas Selector Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <Mic size={13} className="text-indigo-400" />
                    <label className="text-xs uppercase tracking-widest text-slate-300 font-bold">
                      Диктор ({activeVoices.length})
                    </label>
                  </div>
                  <span className="text-[10px] text-indigo-400 font-semibold px-1.5 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20">
                    Всего: {allVoicesForLang.length}
                  </span>
                </div>

                {/* Search input for voices */}
                <div className="relative">
                  <input 
                    type="text"
                    value={voiceSearchQuery}
                    onChange={(e) => setVoiceSearchQuery(e.target.value)}
                    placeholder="Быстрый поиск голоса..."
                    className="w-full bg-[#14141a] rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500 placeholder:text-slate-600 transition-all"
                  />
                  {voiceSearchQuery && (
                    <button 
                      onClick={() => setVoiceSearchQuery('')}
                      className="absolute right-2 top-1.5 text-slate-500 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Category filter pills */}
                <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar text-[10px]">
                  {[
                    { id: 'all', label: `Все (${categoryCounts.all || 0})` },
                    { id: 'cinema', label: `🎬 Кино (${categoryCounts.cinema || 0})` },
                    { id: 'narrator', label: `🎙️ Дикторы (${categoryCounts.narrator || 0})` },
                    { id: 'character', label: `✨ Герои (${categoryCounts.character || 0})` },
                    { id: 'asmr', label: `🧘 ASMR (${categoryCounts.asmr || 0})` },
                    { id: 'media', label: `📱 Медиа (${categoryCounts.media || 0})` },
                    { id: 'system', label: `💻 Системные (${categoryCounts.system || 0})` },
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedVoiceCategory(cat.id)}
                      className={`px-2 py-1 rounded-md font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        selectedVoiceCategory === cat.id 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'bg-[#15151b] text-slate-400 hover:text-white border border-white/5'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                
                {/* Voice presets selector list with comfortable height */}
                <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                  {activeVoices.map((voice) => {
                    const isSelected = voice.id === selectedVoiceId;
                    const isPreviewing = previewingVoiceId === voice.id;
                    return (
                      <div 
                        key={voice.id}
                        id={`voice-card-${voice.id}`}
                        onClick={() => { setSelectedVoiceId(voice.id); handleStopSpeaking(); }}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between select-none ${
                          isSelected 
                            ? 'bg-[#1a1a24] border-indigo-500/70 shadow-md shadow-indigo-600/[0.1] ring-1 ring-indigo-500/30' 
                            : 'bg-[#131317]/80 border-white/5 hover:border-white/15 hover:bg-[#16161d]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                            voice.category === 'cinema' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25' :
                            voice.category === 'narrator' ? 'bg-blue-500/15 text-blue-300 border border-blue-500/25' :
                            voice.category === 'character' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' :
                            voice.category === 'asmr' ? 'bg-pink-500/15 text-pink-300 border border-pink-500/25' :
                            voice.category === 'media' ? 'bg-purple-500/15 text-purple-300 border border-purple-500/25' :
                            'bg-slate-800 text-slate-300 border border-white/10'
                          }`}>
                            {voice.avatar || (voice.gender === 'male' ? '👨' : '👩')}
                          </div>
                          <div className="text-left min-w-0">
                            <div className="text-xs font-semibold text-white flex items-center gap-1.5 truncate">
                              <span className="truncate">{voice.name}</span>
                              {voice.provider === 'gemini' ? (
                                <span className="px-1 text-[8px] font-bold bg-indigo-600 text-white rounded uppercase whitespace-nowrap tracking-wide select-none">AI</span>
                              ) : (
                                <span className="px-1 text-[8px] font-bold bg-slate-700 text-slate-300 rounded uppercase whitespace-nowrap">OS</span>
                              )}
                              {isSelected && <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse flex-shrink-0"></span>}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate">{voice.accent}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={(e) => handlePreviewVoice(e, voice)}
                            title="Прослушать пример звучания (демо)"
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              isPreviewing
                                ? 'bg-indigo-600 text-white border-indigo-400 animate-pulse'
                                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border-white/5'
                            }`}
                          >
                            {isPreviewing ? (
                              <Loader2 size={11} className="animate-spin text-white" />
                            ) : (
                              <Volume2 size={11} />
                            )}
                          </button>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white flex-shrink-0">
                              <Check size={10} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {activeVoices.length === 0 && (
                    <div className="py-6 text-center text-xs text-slate-500 italic space-y-2">
                      <div>Дикторы по запросу не найдены.</div>
                      <button 
                        type="button"
                        onClick={() => { setSelectedVoiceCategory('all'); setVoiceSearchQuery(''); }}
                        className="px-3 py-1 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white rounded-md text-[11px] font-semibold transition-all cursor-pointer"
                      >
                        Показать все {allVoicesForLang.length} голосов
                      </button>
                    </div>
                  )}
                </div>

                {/* Custom Voice Prompt Field if 'gemini-custom' is selected */}
                {selectedVoiceProfile?.persona === 'custom' && (
                  <div className="p-3 bg-[#13131a] rounded-xl border border-indigo-500/30 space-y-2 mt-2">
                    <div className="flex items-center justify-between text-[11px] text-indigo-400 font-bold">
                      <span>Свой промпт для тембра:</span>
                      <Wand2 size={12} />
                    </div>
                    <textarea 
                      value={customPersonaPrompt}
                      onChange={(e) => setCustomPersonaPrompt(e.target.value)}
                      placeholder="Пример: хриплый голос 50-летнего капитана дальнего плавания, глубокий бархат, усталая мудрость и легкий табачный акцент..."
                      className="w-full h-18 bg-[#0b0b0e] rounded-lg p-2 text-xs text-slate-200 border border-white/10 outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                )}
              </div>

              {/* Emotions & Intonation Selector */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium flex items-center gap-1">
                    <Smile size={13} className="text-indigo-400" />
                    Эмоция / Интонация
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">{selectedEmotion}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'neutral', label: 'Обычный' },
                    { id: 'whisper', label: '🤫 Шепот' },
                    { id: 'dramatic', label: '🎬 Драма' },
                    { id: 'enthusiastic', label: '✨ Энергия' },
                    { id: 'sarcastic', label: '😏 Сарказм' },
                    { id: 'confident', label: '👔 Уверенный' },
                    { id: 'calm', label: '🧘 Спокойный' },
                  ].map(emo => (
                    <button
                      key={emo.id}
                      onClick={() => setSelectedEmotion(emo.id)}
                      className={`px-2.5 py-1.5 text-[11px] rounded-lg font-medium border text-left transition-all cursor-pointer ${
                        selectedEmotion === emo.id 
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm' 
                          : 'bg-[#141418] text-slate-400 border-white/5 hover:text-white hover:bg-[#181822]'
                      }`}
                    >
                      {emo.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Studio Mastering & DSP Filters (Warm Tube Bass + Broadcast Punch) */}
              <div className="p-3.5 bg-[#121218] rounded-xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-1.5">
                    <SlidersHorizontal size={13} className="text-amber-400" />
                    Студийный мастеринг
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-300 font-mono rounded">DSP 48kHz</span>
                </div>

                <div className="space-y-2 text-xs">
                  <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <Flame size={14} className={warmBass ? "text-amber-400" : "text-slate-600"} />
                      <div>
                        <div className="font-semibold text-slate-200">Теплый ламповый бас</div>
                        <div className="text-[10px] text-slate-500">+5dB @ 140Hz, кинообъем</div>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={warmBass} 
                      onChange={(e) => setWarmBass(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <Radio size={14} className={broadcastMastering ? "text-indigo-400" : "text-slate-600"} />
                      <div>
                        <div className="font-semibold text-slate-200">Broadcast Компрессор</div>
                        <div className="text-[10px] text-slate-500">Плотность и нормализация</div>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={broadcastMastering} 
                      onChange={(e) => setBroadcastMastering(e.target.checked)}
                      className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Slider controls speed & pitch */}
              <div className="space-y-4">
                
                {/* Rate Speed */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Скорость речи</span>
                    <span className="text-indigo-400 font-mono font-bold">{speed.toFixed(1)}x</span>
                  </div>
                  <input 
                    id="speed-range"
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={speed}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setSpeed(val);
                      const isPitchActive = pitch !== 0;
                      const effectiveRate = Math.max(0.25, Math.min(4.0, isPitchActive ? val * (1.0 + (pitch / 100)) : val));
                      if (webAudioSourceRef.current) {
                        try {
                          webAudioSourceRef.current.playbackRate.setValueAtTime(effectiveRate, (audioContextRef.current?.currentTime || 0));
                        } catch (err) {}
                      }
                      if (audioRef.current) {
                        try {
                          audioRef.current.playbackRate = effectiveRate;
                        } catch (err) {}
                      }
                    }}
                    className="w-full h-1 bg-[#1a1a22] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Pitch Modulator */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Тон высоты (Pitch)</span>
                    <span className="text-indigo-400 font-mono font-bold">
                      {pitch > 0 ? `+${pitch}` : pitch}%
                    </span>
                  </div>
                  <input 
                    id="pitch-range"
                    type="range"
                    min="-20"
                    max="20"
                    step="1"
                    value={pitch}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setPitch(val);
                      const isPitchActive = val !== 0;
                      const effectiveRate = Math.max(0.25, Math.min(4.0, isPitchActive ? speed * (1.0 + (val / 100)) : speed));
                      if (webAudioSourceRef.current) {
                        try {
                          webAudioSourceRef.current.playbackRate.setValueAtTime(effectiveRate, (audioContextRef.current?.currentTime || 0));
                        } catch (err) {}
                      }
                      if (audioRef.current) {
                        try {
                          audioRef.current.playbackRate = effectiveRate;
                        } catch (err) {}
                      }
                    }}
                    className="w-full h-1 bg-[#1a1a22] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Pause Markers Settings */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Длина умных пауз</span>
                    <span className="text-indigo-400 font-mono font-bold text-[11px] uppercase">
                      {pauses === 'auto' ? 'Авто' : pauses === 'short' ? 'Короткие' : 'Долгие'}
                    </span>
                  </div>
                  <div className="flex gap-1.5 p-0.5 bg-[#14141a] rounded-lg border border-white/5">
                    <button 
                      type="button" 
                      onClick={() => setPauses('auto')}
                      className={`flex-1 py-1.5 text-[10px] rounded font-extrabold transition-all cursor-pointer ${
                        pauses === 'auto' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      AUTO
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setPauses('short')}
                      className={`flex-1 py-1.5 text-[10px] rounded font-extrabold transition-all cursor-pointer ${
                        pauses === 'short' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      SHORT
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setPauses('long')}
                      className={`flex-1 py-1.5 text-[10px] rounded font-extrabold transition-all cursor-pointer ${
                        pauses === 'long' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      LONG
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit CTA Bottom Column */}
              <div className="mt-auto pt-4 space-y-2 border-t border-white/5" id="generation-bar">
                <button 
                  id="btn-generate-audio"
                  disabled={isGenerating || text.trim().length === 0}
                  onClick={handleGenerateAudio}
                  className={`w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-950 disabled:text-slate-500 disabled:scale-100 text-white rounded-xl font-bold tracking-wide shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer`}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={17} className="animate-spin text-white" />
                      <span>Идет генерация речи...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={18} className="text-amber-300 fill-amber-300" />
                      <span>Сгенерировать ({selectedModel === 'gemini-3.8-flash-tts' ? 'Flash 3.8' : 'Flash Lite'})</span>
                    </>
                  )}
                </button>

                {/* Direct audio listen button if audio is ready */}
                {(lastGeneratedAudioUrl || lastGeneratedBlobUrl) && (
                  <button 
                    type="button"
                    onClick={togglePlayback}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                      isPlaying 
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30' 
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Pause size={14} fill="currentColor" stroke="none" />
                        <span>Приостановить звук</span>
                      </>
                    ) : (
                      <>
                        <Play size={14} fill="currentColor" stroke="none" />
                        <span>Слушать готовую озвучку</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </aside>
          </div>
        )}

        {/* TAB 2: Voices Catalog & Detailed Presets */}
        {activeTab === 'library' && (
          <div className="flex-1 p-8 overflow-y-auto flex flex-col" id="library-workspace">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <Languages size={20} className="text-indigo-400" />
                  Каталог голосовых персон Gemini 3.8
                </h2>
                <p className="text-xs text-slate-500 mt-1">Кинематографичные голоса актеров, дикторов и конструктор тембра</p>
              </div>

              {/* Locale filters */}
              <div className="flex rounded-lg bg-[#0f0f12] p-1 border border-white/5 gap-1 flex-wrap">
                <button 
                  onClick={() => setSelectedLang('ru-RU')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${selectedLang === 'ru-RU' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Русский
                </button>
                <button 
                  onClick={() => setSelectedLang('en-US')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${selectedLang === 'en-US' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  English
                </button>
                <button 
                  onClick={() => setSelectedLang('uk-UA')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${selectedLang === 'uk-UA' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Українська
                </button>
                <button 
                  onClick={() => setSelectedLang('es-ES')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${selectedLang === 'es-ES' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Español
                </button>
                <button 
                  onClick={() => setSelectedLang('de-DE')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${selectedLang === 'de-DE' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Deutsch
                </button>
              </div>
            </div>

            {/* Catalog Search & Category Filters */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'all', label: `Все категории (${categoryCounts.all || 0})` },
                  { id: 'cinema', label: `🎬 Кино & Дубляж (${categoryCounts.cinema || 0})` },
                  { id: 'narrator', label: `🎙️ Дикторы & Книги (${categoryCounts.narrator || 0})` },
                  { id: 'character', label: `✨ Персонажи & Игры (${categoryCounts.character || 0})` },
                  { id: 'asmr', label: `🧘 ASMR & Релакс (${categoryCounts.asmr || 0})` },
                  { id: 'media', label: `📱 Медиа & Блоги (${categoryCounts.media || 0})` },
                  { id: 'system', label: `💻 Системные (${categoryCounts.system || 0})` },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedVoiceCategory(cat.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      selectedVoiceCategory === cat.id 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25' 
                        : 'bg-[#121217] text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-72">
                <input 
                  type="text"
                  value={voiceSearchQuery}
                  onChange={(e) => setVoiceSearchQuery(e.target.value)}
                  placeholder="Поиск по имени или стилю..."
                  className="w-full bg-[#121217] rounded-lg border border-white/10 px-3.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500 placeholder:text-slate-600 transition-all"
                />
                {voiceSearchQuery && (
                  <button 
                    onClick={() => setVoiceSearchQuery('')}
                    className="absolute right-2.5 top-1.5 text-slate-500 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Grid of Voices */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeVoices.map((voice) => {
                const isSelected = voice.id === selectedVoiceId;
                const isPreviewing = previewingVoiceId === voice.id;
                return (
                  <div 
                    key={voice.id}
                    onClick={() => {
                      setSelectedVoiceId(voice.id);
                      setActiveTab('editor');
                    }}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected 
                        ? 'bg-[#181822] border-indigo-500/70 ring-1 ring-indigo-500 shadow-xl' 
                        : 'bg-[#111116] border-white/5 hover:border-white/20 hover:bg-[#14141c]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm ${
                            voice.persona === 'pitt' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            voice.persona === 'freeman' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                            voice.persona === 'cyberpunk' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            voice.persona === 'meditation' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' :
                            voice.gender === 'male' ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'
                          }`}>
                            {voice.persona === 'pitt' ? '🎬' :
                             voice.persona === 'freeman' ? '🎙️' :
                             voice.persona === 'cyberpunk' ? '🕶️' :
                             voice.persona === 'meditation' ? '🧘' :
                             voice.name[0]}
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                              {voice.name}
                              {voice.provider === 'gemini' && (
                                <span className="px-1.5 py-0.2 text-[8px] bg-indigo-600 text-white font-mono rounded font-bold">
                                  AI STUDIO
                                </span>
                              )}
                            </h3>
                            <span className="text-[11px] text-slate-400 font-medium">{voice.accent}</span>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                            <Check size={11} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">
                        {voice.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={(e) => handlePreviewVoice(e, voice)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer font-medium ${
                          isPreviewing
                            ? 'bg-indigo-600 text-white border-indigo-400 animate-pulse'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
                        }`}
                      >
                        {isPreviewing ? (
                          <Loader2 size={12} className="animate-spin text-white" />
                        ) : (
                          <Volume2 size={12} className="text-indigo-400" />
                        )}
                        <span>{isPreviewing ? 'Слушаем...' : 'Демо голоса'}</span>
                      </button>
                      <button className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer">
                        Выбрать голос →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {activeVoices.length === 0 && (
              <div className="py-12 text-center text-sm text-slate-500 italic space-y-3">
                <div>В этой категории или по вашему запросу дикторы не найдены.</div>
                <button 
                  type="button"
                  onClick={() => { setSelectedVoiceCategory('all'); setVoiceSearchQuery(''); }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 transition-all cursor-pointer shadow-lg shadow-indigo-600/30"
                >
                  Показать все {allVoicesForLang.length} голосов
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: History of Past Projects */}
        {activeTab === 'history' && (
          <div className="flex-1 p-8 overflow-y-auto flex flex-col" id="history-workspace">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <History size={20} className="text-indigo-400" />
                  История озвученных проектов
                </h2>
                <p className="text-xs text-slate-500 mt-1">Все сгенерированные файлы с возможностью повторного прослушивания и скачивания</p>
              </div>

              {history.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 size={13} /> Очистить историю
                </button>
              )}
            </div>

            <div className="space-y-3">
              {history.map((project) => (
                <div 
                  key={project.id} 
                  className="p-5 bg-[#111116] rounded-xl border border-white/5 hover:border-white/10 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-start gap-4 flex-1 pr-6">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                      <Mic size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white text-sm">{project.voiceName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-white/5 text-slate-400 font-mono rounded">
                          {project.timestamp}
                        </span>
                        {project.modelUsed && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 font-mono rounded">
                            {project.modelUsed.replace('gemini-3.8-', '')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        {project.text}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-2 font-mono">
                        <span>Длина: {project.text.length} симв.</span>
                        <span>•</span>
                        <span>Скорость: {project.speed}x</span>
                        <span>•</span>
                        <span>Паузы: {project.pauses}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-4">
                    {project.audioUrl && (
                      <button 
                        onClick={() => {
                          setLastGeneratedAudioUrl(project.audioUrl!);
                          playAudioData(project.audioUrl!);
                        }}
                        className="p-2.5 bg-indigo-500/10 hover:bg-indigo-600 hover:text-white text-indigo-400 rounded-lg border border-indigo-500/10 transition-colors cursor-pointer"
                        title="Прослушать аудиозапись"
                      >
                        <Play size={14} fill="currentColor" />
                      </button>
                    )}
                    
                    {project.audioUrl && (
                      <button 
                        onClick={() => handleDownloadAudioFile(project.audioUrl!, `vox-audio-${project.id}.wav`)}
                        className="p-2.5 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-400 rounded-lg border border-emerald-500/10 transition-colors cursor-pointer flex items-center justify-center"
                        title="Скачать WAV 48 кГц"
                      >
                        <Download size={14} />
                      </button>
                    )}

                    <button 
                      onClick={(e) => deleteHistoryItem(project.id, e)}
                      className="p-2.5 hover:bg-red-950/20 hover:text-red-400 text-slate-600 rounded-lg border border-transparent transition-colors cursor-pointer"
                      title="Удалить"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {history.length === 0 && (
                <div className="py-16 text-center space-y-3 bg-[#0d0d10] rounded-2xl border border-white/5">
                  <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-slate-500 mx-auto">
                    <History size={20} />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Список проектов пуст</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">Каждая генерация аудио автоматически сохраняется здесь для быстрого скачивания.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Footer Media Player & Waveform Visualizer */}
      <footer className="h-24 bg-[#0a0a0c] border-t border-white/5 flex items-center px-8 gap-8 flex-shrink-0" id="vox-playback-footer">
        
        {/* Play center trigger */}
        <button 
          id="btn-playback-toggle"
          onClick={togglePlayback}
          title={isPlaying ? "Поставить на паузу" : "Прослушать текущий текст"}
          className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
            isPlaying 
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 font-bold scale-105' 
              : 'bg-white hover:bg-slate-200 text-black shadow-lg hover:scale-105 font-bold'
          }`}
        >
          {isPlaying ? (
            <Pause size={20} fill="currentColor" stroke="none" />
          ) : (
            <Play size={20} fill="currentColor" stroke="none" className="translate-x-0.5" />
          )}
        </button>

        {/* Dynamic Oscilloscope wave visualisation */}
        <div className="flex-1 flex flex-col gap-2.5">
          <div className="flex items-end gap-1 h-12 py-1 select-none overflow-hidden" id="viz-waveform">
            {waveHeights.map((ht, idx) => {
              const relativeProgressIndex = Math.floor((currentProgress / 100) * waveHeights.length);
              const isActive = isPlaying && idx <= relativeProgressIndex;
              const hasColorGradient = idx >= Math.floor(waveHeights.length * 0.2) && idx <= Math.floor(waveHeights.length * 0.5);
              
              let barColor = 'bg-slate-800';
              if (isPlaying) {
                if (isActive) {
                  barColor = hasColorGradient ? 'bg-amber-400' : 'bg-indigo-500';
                } else {
                  barColor = 'bg-[#1b1b23]';
                }
              } else if (currentProgress === 100) {
                barColor = 'bg-indigo-500/30';
              }

              return (
                <div 
                  key={idx} 
                  style={{ height: `${ht}%` }}
                  className={`w-[6px] rounded-full transition-all duration-200 ${barColor}`}
                />
              );
            })}
          </div>

          {/* Timing monitor bar */}
          <div className="flex justify-between text-[10px] font-mono font-semibold text-slate-500">
            <span className="text-slate-400">
              0:{timeSpent < 10 ? '0' + timeSpent : timeSpent}
            </span>
            <span className="text-slate-600 uppercase tracking-wider text-[9px] font-bold">
              {isPlaying ? 'Аудиопоток активен' : 'Ожидание воспроизведения'}
            </span>
            <span>
              0:{estimatedDuration < 10 ? '0' + estimatedDuration : estimatedDuration}
            </span>
          </div>
        </div>

        {/* Volume & Mute Controller */}
        <div className="flex items-center gap-2 border-l border-white/5 pl-6 flex-shrink-0">
          <button
            onClick={() => {
              const newMute = !isMuted;
              setIsMuted(newMute);
              if (audioRef.current) {
                audioRef.current.volume = newMute ? 0 : volume;
              }
            }}
            title={isMuted ? "Включить звук" : "Выключить звук"}
            className="p-2 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            {isMuted || volume === 0 ? (
              <VolumeX size={17} className="text-red-400" />
            ) : (
              <Volume2 size={17} className="text-indigo-400" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setVolume(val);
              setIsMuted(false);
              if (audioRef.current) {
                audioRef.current.volume = val;
              }
            }}
            className="w-16 h-1 bg-[#1a1a22] rounded-lg appearance-none cursor-pointer accent-indigo-500"
            title={`Громкость: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />
        </div>

        {/* Speaker / Audio Output Test Button */}
        <button
          type="button"
          onClick={playSpeakerTest}
          title="Проверить вывод звука и динамики (звуковой сигнал)"
          className="px-2.5 py-1.5 bg-[#14141e] hover:bg-indigo-600/30 text-indigo-300 hover:text-white rounded-lg border border-indigo-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0"
        >
          <Bell size={13} className="text-amber-400" />
          <span className="hidden lg:inline">Тест звука</span>
        </button>

        {/* Action controllers footer right: Downloads for WAV, SRT, VTT, TXT */}
        <div className="flex items-center gap-3 border-l border-white/5 pl-6 flex-shrink-0">
          
          {/* Download generated audio WAV */}
          {lastGeneratedAudioUrl && (
            <button 
              id="btn-download-audio-wav"
              onClick={() => handleDownloadAudioFile(lastGeneratedAudioUrl, `vox-audio-${Date.now()}.wav`)}
              title="Скачать студийный WAV 48 кГц"
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-md shadow-indigo-600/25"
            >
              <Download size={14} />
              <span>Скачать WAV</span>
            </button>
          )}

          {/* Subtitles Download Button (SRT) */}
          <button 
            onClick={() => handleDownloadSubtitles('srt')}
            title="Скачать файл субтитров SRT с таймкодами для видеомонтажа (Premiere, DaVinci, CapCut)"
            className="px-3 py-2 bg-[#171720] hover:bg-[#20202c] text-indigo-300 hover:text-white rounded-lg border border-white/10 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          >
            <Subtitles size={14} />
            <span>Субтитры SRT</span>
          </button>

          {/* Subtitles Download Button (VTT) */}
          <button 
            onClick={() => handleDownloadSubtitles('vtt')}
            title="Скачать файл веб-субтитров WebVTT"
            className="px-2.5 py-2 bg-[#171720] hover:bg-[#20202c] text-slate-400 hover:text-white rounded-lg border border-white/10 transition-all cursor-pointer text-xs font-semibold"
          >
            VTT
          </button>

          {/* Download Output script */}
          <button 
            id="btn-download-project"
            onClick={handleDownloadText}
            title="Скачать конфигурацию проекта и текст"
            className="p-2.5 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg border border-white/5 transition-colors cursor-pointer"
          >
            <Download size={16} />
          </button>
        </div>

      </footer>

      {/* Floating Prompt if Browser Autoplay Policy Blocked Background Sound */}
      {isAutoplayBlocked && (
        <div 
          onClick={togglePlayback}
          className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3.5 px-6 py-3.5 bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600 text-white rounded-2xl shadow-2xl shadow-indigo-600/50 cursor-pointer border border-white/20 hover:scale-105 active:scale-95 transition-all animate-bounce"
        >
          <div className="w-8 h-8 rounded-full bg-white text-indigo-700 flex items-center justify-center font-bold flex-shrink-0">
            <Play size={16} fill="currentColor" stroke="none" className="translate-x-0.5" />
          </div>
          <div>
            <div className="text-xs font-bold leading-tight">Звук готов! Нажмите здесь, чтобы включить воспроизведение</div>
            <div className="text-[10px] text-white/80">Браузер ожидает подтверждения кликом для воспроизведения аудио</div>
          </div>
        </div>
      )}

      {/* Mounted DOM Audio Element for Reliable Playback Fallback in All Browsers and iFrames */}
      <audio 
        ref={audioRef} 
        style={{ position: 'fixed', bottom: -100, opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
        preload="auto" 
        playsInline 
      />

    </div>
  );
}
