import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  ArrowLeft,
  BookOpen,
  Save,
  Check,
  Maximize2,
  Dices,
  RotateCcw,
} from "lucide-react";

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedItem, setExpandedItem] = useState(null);
  const [activeTab, setActiveTab] = useState("");
  const [readingChapter, setReadingChapter] = useState(null);
  const [coverMode, setCoverMode] = useState("default");
  const [savedMessage, setSavedMessage] = useState("");

  // --- ESTADOS DO CRIADOR DE NOVELS ---
  const [creatorGenres, setCreatorGenres] = useState([]);
  const [creatorElements, setCreatorElements] = useState([]);
  const [creatorTitle, setCreatorTitle] = useState("");
  const [creatorInstructions, setCreatorInstructions] = useState("");

  // Estado de Configurações Persistidas
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("lns_settings");
    return saved
      ? JSON.parse(saved)
      : {
          reading: { fontSize: 18, fontFamily: "sans-serif", lineSpacing: 1.8 },
          theme: "default",
          db: { firebaseConfig: "" },
        };
  });

  useEffect(() => {
    localStorage.setItem("lns_settings", JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (category, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [category]: { ...prev[category], [key]: value },
    }));
  };

  const updateTheme = (themeName) => {
    setSettings((prev) => ({ ...prev, theme: themeName }));
  };

  // --- ESTADO PRINCIPAL DO CARROSSEL ---
  const [carouselItems, setCarouselItems] = useState([
    {
      id: "settings",
      isSettings: true,
      title: "Light Novel Studio",
      src: "LNStudio.png",
      synopsis:
        "Central de configurações do aplicativo. Ajuste sua experiência de leitura, aparência e conexão com o banco de dados.",
    },
    {
      id: 1,
      title: "Reencarnação no Sistema",
      src: null,
      synopsis:
        "Um programador exausto morre e reencarna como um NPC dentro do seu próprio jogo incompleto e cheio de bugs.",
      genres: ["Isekai", "Fantasia", "Comédia"],
      elements: ["Sistema de Jogo", "Magia", "Bugs", "Monstros"],
      chapters: [
        {
          id: 201,
          title: "Capítulo 1: Hello World",
          date: "01/04/2026",
          author: "DevGuy",
          content: "Acordei e tudo era código verde caindo do céu...",
        },
      ],
    },
    {
      id: 2,
      title: "Academia de Magia Estelar",
      src: null,
      synopsis:
        "Na fronteira da galáxia, magos e pilotos de mechas estudam juntos para enfrentar uma ameaça cósmica ancestral.",
      genres: ["Fantasia Escolar", "Mecha", "Ação"],
      elements: ["Magia Espacial", "Alienígenas", "Torneios", "Mistério"],
      chapters: [
        {
          id: 301,
          title: "Prólogo: A Estrela Cadente",
          date: "10/01/2026",
          author: "Nova",
          content: "O céu noturno de Alpha Centauri nunca foi tão brilhante...",
        },
      ],
    },
    {
      id: 4,
      title: "O Último Herói do Reino",
      src: null,
      synopsis:
        "Após derrotar o Rei Demônio, o herói descobre que a verdadeira batalha é administrar a economia do reino em ruínas.",
      genres: ["Fantasia", "Política", "Slice of Life"],
      elements: ["Economia", "Construção de Reino", "Demônios Arrependidos"],
      chapters: [],
    },
    {
      id: 5,
      title: "Crônicas do Mundo Oculto",
      src: null,
      synopsis:
        "Uma agência secreta recruta indivíduos com poderes paranormais para investigar anomalias na cidade de Tóquio.",
      genres: ["Sobrenatural", "Mistério", "Ação"],
      elements: [
        "Poderes Psíquicos",
        "Investigação",
        "Tóquio",
        "Organização Secreta",
      ],
      chapters: [],
    },
    {
      id: "creator",
      isCreator: true,
      title: "Criar Nova Light Novel",
      src: null,
      synopsis:
        "Utilize nossa inteligência artificial para gerar a base da sua próxima grande história.",
    },
  ]);

  // Listas de 30 opções para o criador
  const ALL_GENRES = [
    "Isekai",
    "Fantasia",
    "Ficção Científica",
    "Romance",
    "Comédia",
    "Ação",
    "Aventura",
    "Mistério",
    "Terror",
    "Sobrenatural",
    "Slice of Life",
    "Mecha",
    "Escolar",
    "Harém",
    "Harém Inverso",
    "Cultivo (Xianxia)",
    "LitRPG",
    "Drama",
    "Psicológico",
    "Suspense",
    "Histórico",
    "Cyberpunk",
    "Steampunk",
    "Magia",
    "Artes Marciais",
    "Reencarnação",
    "Viagem no Tempo",
    "Sobrevivência",
    "Vida Diária",
    "Vingança",
  ];

  const ALL_ELEMENTS = [
    "Sistema de Jogo",
    "Academia de Magia",
    "Herói Traído",
    "Vilã",
    "Elfos",
    "Demônios",
    "Dragões",
    "Dungeon",
    "Guilda de Aventureiros",
    "Nobreza",
    "Império Galáctico",
    "IA",
    "Apocalipse Zumbi",
    "Deuses",
    "Artefatos Lendários",
    "Magia sem Canto",
    "Habilidades OP",
    "Bestas Mágicas",
    "Vida Lenta",
    "Agricultura",
    "Política",
    "Guerra",
    "Tecnologia vs Magia",
    "Segredos de Família",
    "Assassinos",
    "Monstros Mutantes",
    "Espíritos",
    "Artesanato/Forja",
    "Medicina Mágica",
    "Alquimia",
  ];

  const novelTabs = [
    { id: "sinopse", label: "SINOPSE" },
    { id: "generos", label: "GÊNEROS" },
    { id: "capitulos", label: "CAPÍTULOS" },
  ];

  const settingsTabs = [
    { id: "leitura", label: "LEITURA" },
    { id: "tema", label: "TEMA" },
    { id: "db", label: "BANCO DE DADOS" },
  ];

  const creatorTabs = [
    { id: "generos", label: "GÊNEROS" },
    { id: "elementos", label: "ELEMENTOS" },
    { id: "observacao", label: "OBSERVAÇÃO" },
  ];

  const nextItem = () =>
    setCurrentIndex((prev) =>
      prev === carouselItems.length - 1 ? 0 : prev + 1,
    );
  const prevItem = () =>
    setCurrentIndex((prev) =>
      prev === 0 ? carouselItems.length - 1 : prev - 1,
    );

  const handleItemClick = (index, item) => {
    if (currentIndex === index) {
      setExpandedItem(item);
      if (item.isSettings) setActiveTab("leitura");
      else if (item.isCreator) setActiveTab("generos");
      else setActiveTab("sinopse");
      setReadingChapter(null);
      setCoverMode("default");
    } else {
      setCurrentIndex(index);
    }
  };

  const closeExpandedView = () => {
    setExpandedItem(null);
    setReadingChapter(null);
    setActiveTab("");
    setCoverMode("default");
  };

  const toggleCoverMode = (e) => {
    if (e) e.stopPropagation();
    if (coverMode === "default") setCoverMode("discreet");
    else if (coverMode === "discreet") setCoverMode("full");
    else setCoverMode("default");
  };

  const getTransformStyles = (index) => {
    const offset = index - currentIndex;
    const absOffset = Math.abs(offset);
    const direction = Math.sign(offset);
    const translateX = offset * 220;
    const translateZ = -absOffset * 250;
    const rotateY = direction * -35;
    let opacity = 1;
    if (absOffset > 2) opacity = 0;

    return {
      transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg)`,
      zIndex: 100 - absOffset,
      opacity: opacity,
      filter:
        absOffset === 0
          ? "brightness(1)"
          : `brightness(${1 - absOffset * 0.3})`,
      transition: "all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)",
    };
  };

  // Funções Auxiliares do Criador
  const toggleSelection = (list, setList, item) => {
    if (list.includes(item)) setList(list.filter((i) => i !== item));
    else setList([...list, item]);
  };

  const pickRandom = (sourceList, setList, count) => {
    const shuffled = [...sourceList].sort(() => 0.5 - Math.random());
    setList(shuffled.slice(0, count));
  };

  const resetCreator = () => {
    setCreatorGenres([]);
    setCreatorElements([]);
    setCreatorTitle("");
    setCreatorInstructions("");
  };

  const saveNewLN = () => {
    const newLN = {
      id: Date.now(),
      title: creatorTitle || "Light Novel Sem Título",
      src: null,
      synopsis: "A sinopse será gerada baseada no prompt...",
      genres: [...creatorGenres],
      elements: [...creatorElements],
      chapters: [],
    };

    setCarouselItems((prev) => {
      const updated = [...prev];
      updated.splice(updated.length - 1, 0, newLN);
      return updated;
    });

    resetCreator();
    closeExpandedView();
    setCurrentIndex(carouselItems.length - 1);
  };

  // --- RENDERIZAÇÕES ---

  const renderSettingsContent = () => {
    switch (activeTab) {
      case "leitura":
        return (
          <div className="animate-fade-in flex-grow flex flex-col space-y-8 overflow-y-auto custom-scrollbar pr-2 md:pr-4">
            <div>
              <label className="block text-muted font-semibold mb-2">
                Tamanho da Fonte ({settings.reading.fontSize}px)
              </label>
              <input
                type="range"
                min="14"
                max="32"
                step="1"
                value={settings.reading.fontSize}
                onChange={(e) =>
                  updateSettings("reading", "fontSize", e.target.value)
                }
                className="w-full accent-accent cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-muted font-semibold mb-2">
                Espaçamento de Linha ({settings.reading.lineSpacing})
              </label>
              <input
                type="range"
                min="1.2"
                max="2.5"
                step="0.1"
                value={settings.reading.lineSpacing}
                onChange={(e) =>
                  updateSettings("reading", "lineSpacing", e.target.value)
                }
                className="w-full accent-accent cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-muted font-semibold mb-2">
                Tipo de Fonte
              </label>
              <select
                value={settings.reading.fontFamily}
                onChange={(e) =>
                  updateSettings("reading", "fontFamily", e.target.value)
                }
                className="w-full bg-card text-main border border-subtle p-3 rounded-lg outline-none focus:ring-2 focus:ring-accent transition-colors cursor-pointer"
              >
                <option value="sans-serif">Sans Serif (Moderno)</option>
                <option value="serif">Serif (Clássico)</option>
                <option value="monospace">
                  Monospace (Máquina de Escrever)
                </option>
              </select>
            </div>
            <div className="mt-8 p-6 bg-card border border-subtle rounded-xl shadow-inner mt-auto">
              <h4 className="text-muted text-xs font-bold uppercase mb-4 border-b border-subtle pb-2">
                Pré-visualização
              </h4>
              <p
                style={{
                  fontSize: `${settings.reading.fontSize}px`,
                  lineHeight: settings.reading.lineSpacing,
                  fontFamily: settings.reading.fontFamily,
                }}
                className="text-main"
              >
                As variáveis começaram a fluir não como dados frios, mas como
                emoções. Eu percebi que a humanidade sempre usou histórias para
                tentar entender a si mesma.
              </p>
            </div>
          </div>
        );
      case "tema":
        const themesList = [
          {
            id: "default",
            name: "Padrão",
            color1: "#111827",
            color2: "#3b82f6",
          },
          { id: "light", name: "Claro", color1: "#ffffff", color2: "#0ea5e9" },
          {
            id: "dracula",
            name: "Drácula",
            color1: "#282a36",
            color2: "#bd93f9",
          },
          { id: "sepia", name: "Sépia", color1: "#f4ecd8", color2: "#d97706" },
          {
            id: "hacker",
            name: "Terminal",
            color1: "#0a0a0a",
            color2: "#22c55e",
          },
        ];
        return (
          <div className="animate-fade-in flex-grow flex flex-col space-y-4 overflow-y-auto custom-scrollbar pr-2 md:pr-4">
            <h3 className="text-muted font-semibold mb-2">
              Escolha a aparência do aplicativo:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {themesList.map((t) => (
                <button
                  key={t.id}
                  onClick={() => updateTheme(t.id)}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer ${settings.theme === t.id ? "border-accent bg-card shadow-accent" : "border-subtle hover-bg-card opacity-80"}`}
                >
                  <div className="w-10 h-10 rounded-full shadow-md flex-shrink-0 flex overflow-hidden border border-black/20">
                    <div style={{ backgroundColor: t.color1, flex: 1 }}></div>
                    <div style={{ backgroundColor: t.color2, flex: 1 }}></div>
                  </div>
                  <span className="text-main font-medium text-left flex-grow">
                    {t.name}
                  </span>
                  {settings.theme === t.id && (
                    <Check className="text-accent" size={20} />
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      case "db":
        return (
          <div className="animate-fade-in flex-grow flex flex-col space-y-6 overflow-y-auto custom-scrollbar pr-2 md:pr-4">
            <div className="bg-card border border-subtle p-5 rounded-xl">
              <h3 className="text-main font-bold mb-3 flex items-center gap-2">
                <Save size={18} className="text-accent" /> Como conectar ao
                Firebase (Passo a Passo)
              </h3>
              <div className="text-main opacity-90 text-sm leading-relaxed mb-4 space-y-2">
                <p>
                  Siga estas instruções para habilitar o salvamento em nuvem:
                </p>
                <ol className="list-decimal list-outside pl-5 space-y-2">
                  <li>
                    Acesse o{" "}
                    <a
                      href="https://console.firebase.google.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent font-semibold hover:underline"
                    >
                      Console do Firebase
                    </a>{" "}
                    com sua conta Google.
                  </li>
                  <li>
                    Clique em <strong>"Adicionar projeto"</strong>. Dê um nome
                    ao seu app e prossiga (você pode desativar o Google
                    Analytics para simplificar).
                  </li>
                  <li>
                    Na tela inicial do projeto criado, clique no ícone circular
                    da Web <strong>( &lt;/&gt; )</strong> para adicionar um
                    aplicativo.
                  </li>
                  <li>
                    Dê um apelido (ex: "LNS Web") e clique em{" "}
                    <strong>"Registrar app"</strong>.
                  </li>
                  <li>
                    Um bloco de código vai aparecer. Copie{" "}
                    <strong>apenas o conteúdo</strong> que está entre as chaves{" "}
                    <code>{`{ ... }`}</code> da variável{" "}
                    <code>firebaseConfig</code>.
                  </li>
                  <li>
                    No menu lateral esquerdo do Firebase, vá em{" "}
                    <strong>"Firestore Database"</strong> e clique em "Criar
                    banco de dados".
                  </li>
                  <li>
                    Escolha <strong>"Iniciar no modo de teste"</strong> (Start
                    in test mode) e avance até concluir.
                  </li>
                  <li>
                    Volte aqui, transforme o código que você copiou em um{" "}
                    <strong>JSON válido</strong> (usando aspas duplas em todas
                    as chaves) e cole no campo abaixo.
                  </li>
                </ol>
              </div>
            </div>
            <div className="flex-grow flex flex-col">
              <label className="block text-muted font-semibold mb-2">
                Configuração do Firebase (JSON)
              </label>
              <textarea
                value={settings.db.firebaseConfig}
                onChange={(e) => {
                  updateSettings("db", "firebaseConfig", e.target.value);
                  setSavedMessage("Salvo automaticamente no navegador!");
                  setTimeout(() => setSavedMessage(""), 3000);
                }}
                placeholder={`{\n  "apiKey": "SUA_API_KEY",\n  "authDomain": "seu-app.firebaseapp.com",\n  "projectId": "seu-app",\n  "storageBucket": "seu-app.appspot.com",\n  "messagingSenderId": "123456789",\n  "appId": "1:123456:web:abcd"\n}`}
                className="flex-grow w-full bg-app border border-subtle text-main p-4 rounded-xl font-mono text-sm resize-none outline-none focus:ring-2 focus:ring-accent custom-scrollbar transition-colors"
              />
              {savedMessage && (
                <p className="text-accent font-medium text-sm mt-2 animate-fade-in">
                  {savedMessage}
                </p>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderCreatorContent = () => {
    switch (activeTab) {
      case "generos":
        return (
          <div className="animate-fade-in flex-grow flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="text-lg md:text-xl text-muted font-semibold">
                Selecione os Gêneros
              </h3>
              <button
                onClick={() => pickRandom(ALL_GENRES, setCreatorGenres, 3)}
                className="flex items-center gap-1.5 md:gap-2 text-sm bg-accent/10 hover:bg-accent/20 text-accent px-3 py-2 md:px-4 rounded-lg font-medium transition-colors"
              >
                <Dices size={16} />{" "}
                <span className="hidden sm:inline">Aleatório (3)</span>
                <span className="sm:hidden">(3)</span>
              </button>
            </div>
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 pb-4">
              <div className="flex flex-wrap gap-2.5">
                {ALL_GENRES.map((g) => (
                  <button
                    key={g}
                    onClick={() =>
                      toggleSelection(creatorGenres, setCreatorGenres, g)
                    }
                    className={`px-4 py-2 text-sm font-medium rounded-xl transition-all border
                      ${
                        creatorGenres.includes(g)
                          ? "bg-accent border-accent text-accent-text shadow-accent"
                          : "bg-card border-subtle text-main hover:border-accent hover:text-accent"
                      }
                    `}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case "elementos":
        return (
          <div className="animate-fade-in flex-grow flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="text-lg md:text-xl text-muted font-semibold">
                Selecione os Elementos
              </h3>
              <button
                onClick={() => pickRandom(ALL_ELEMENTS, setCreatorElements, 6)}
                className="flex items-center gap-1.5 md:gap-2 text-sm bg-accent/10 hover:bg-accent/20 text-accent px-3 py-2 md:px-4 rounded-lg font-medium transition-colors"
              >
                <Dices size={16} />{" "}
                <span className="hidden sm:inline">Aleatório (6)</span>
                <span className="sm:hidden">(6)</span>
              </button>
            </div>
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 pb-4">
              <div className="flex flex-wrap gap-2.5">
                {ALL_ELEMENTS.map((e) => (
                  <button
                    key={e}
                    onClick={() =>
                      toggleSelection(creatorElements, setCreatorElements, e)
                    }
                    className={`px-4 py-2 text-sm font-medium rounded-xl transition-all border
                      ${
                        creatorElements.includes(e)
                          ? "bg-accent border-accent text-accent-text shadow-accent"
                          : "bg-card border-subtle text-main hover:border-accent hover:text-accent"
                      }
                    `}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case "observacao":
        return (
          <div className="animate-fade-in flex-grow flex flex-col space-y-6 overflow-y-auto custom-scrollbar pr-2 md:pr-4">
            <div>
              <label className="block text-muted font-semibold mb-2">
                Título Sugerido (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: O Rei Demônio que abriu um Café..."
                value={creatorTitle}
                onChange={(e) => setCreatorTitle(e.target.value)}
                className="w-full bg-card border border-subtle text-main p-4 rounded-xl outline-none focus:ring-2 focus:ring-accent transition-colors"
              />
            </div>
            <div className="flex-grow flex flex-col">
              <label className="block text-muted font-semibold mb-2">
                Instruções Adicionais para a IA
              </label>
              <textarea
                placeholder="Descreva aqui regras para o mundo, a personalidade do protagonista, clichês que quer evitar ou focar..."
                value={creatorInstructions}
                onChange={(e) => setCreatorInstructions(e.target.value)}
                className="flex-grow w-full bg-card border border-subtle text-main p-4 rounded-xl resize-none outline-none focus:ring-2 focus:ring-accent custom-scrollbar transition-colors"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderNovelContent = () => {
    switch (activeTab) {
      case "sinopse":
        return (
          <div className="animate-fade-in flex-grow flex flex-col overflow-y-auto custom-scrollbar pr-2 md:pr-4">
            <p className="text-main opacity-90 text-base md:text-lg leading-relaxed mb-4">
              {expandedItem.synopsis}
            </p>
          </div>
        );
      case "generos":
        return (
          <div className="animate-fade-in flex-grow flex flex-col space-y-6 md:space-y-8 overflow-y-auto custom-scrollbar pr-2 md:pr-4">
            <div>
              <h3 className="text-lg md:text-xl text-muted font-semibold mb-3 border-b border-subtle pb-2">
                Gêneros
              </h3>
              <div className="flex flex-wrap gap-2 pt-1">
                {expandedItem.genres?.length > 0 ? (
                  expandedItem.genres.map((genre, idx) => (
                    <span
                      key={idx}
                      className="px-4 py-1.5 text-xs md:text-sm font-semibold rounded-full shadow-sm"
                      style={{
                        backgroundColor: "var(--accent-muted)",
                        color: "var(--accent-main)",
                      }}
                    >
                      {genre}
                    </span>
                  ))
                ) : (
                  <span className="text-muted italic text-sm">
                    Nenhum gênero.
                  </span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg md:text-xl text-muted font-semibold mb-3 border-b border-subtle pb-2">
                Elementos
              </h3>
              <div className="flex flex-wrap gap-2 pt-1">
                {expandedItem.elements?.length > 0 ? (
                  expandedItem.elements.map((element, idx) => (
                    <span
                      key={idx}
                      className="px-4 py-1.5 bg-card border border-subtle text-main text-xs md:text-sm font-medium rounded-lg shadow-sm hover:border-accent transition-colors cursor-default"
                    >
                      {element}
                    </span>
                  ))
                ) : (
                  <span className="text-muted italic text-sm">
                    Nenhum elemento.
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      case "capitulos":
        return (
          <div className="animate-fade-in flex-grow flex flex-col h-full overflow-hidden">
            <h3 className="text-lg md:text-xl text-muted font-semibold mb-3 border-b border-subtle pb-2 flex-shrink-0">
              Lista de Capítulos
            </h3>

            <div className="flex-grow overflow-y-auto pr-2 space-y-2 md:space-y-3 mb-4 custom-scrollbar">
              {expandedItem.chapters?.length > 0 ? (
                expandedItem.chapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    onClick={() => setReadingChapter(chapter)}
                    className="bg-card/50 hover-bg-card border border-transparent hover:border-subtle p-4 rounded-xl cursor-pointer transition-all group flex items-center justify-between"
                  >
                    <div className="truncate pr-4">
                      <h4 className="text-main font-medium text-sm md:text-base group-hover:text-accent transition-colors truncate">
                        {chapter.title}
                      </h4>
                      <p className="text-xs md:text-sm text-muted mt-1">
                        Por {chapter.author}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 md:gap-2 flex-shrink-0">
                      <span className="text-[10px] md:text-xs text-muted">
                        {chapter.date}
                      </span>
                      <BookOpen
                        size={14}
                        className="text-muted group-hover:text-accent transition-colors md:w-4 md:h-4"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-muted italic text-sm">
                  Nenhum capítulo publicado.
                </div>
              )}
            </div>

            <div className="mt-auto flex flex-col sm:flex-row gap-3 pt-4 border-t border-subtle flex-shrink-0">
              <button
                onClick={() => {
                  if (expandedItem.chapters?.length > 0) {
                    setReadingChapter(expandedItem.chapters[0]);
                  } else {
                    alert("Esta novel ainda não possui capítulos.");
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-accent hover-bg-accent text-accent-text py-3 rounded-xl font-bold transition-all shadow-accent text-sm sm:text-base"
              >
                <BookOpen size={18} />
                Continuar Leitura
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 bg-card text-main border border-subtle hover:border-strong py-3 rounded-xl font-medium transition-all text-sm sm:text-base">
                <Plus size={18} />
                Criar Novo
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const currentTabs = expandedItem?.isSettings
    ? settingsTabs
    : expandedItem?.isCreator
      ? creatorTabs
      : novelTabs;

  return (
    <div
      className={`theme-${settings.theme} min-h-screen bg-app text-main flex flex-col items-center justify-center overflow-hidden font-sans transition-colors duration-300`}
    >
      <style>
        {`
          /* DEFINIÇÃO DOS TEMAS REFINADOS */
          .theme-default {
            --bg-base: #030712; 
            --bg-surface: #111827; 
            --bg-card: #1f2937; 
            --bg-card-hover: #374151; 
            --text-primary: #f9fafb; 
            --text-secondary: #9ca3af; 
            --border-subtle: rgba(255, 255, 255, 0.08); 
            --border-strong: rgba(255, 255, 255, 0.2); 
            --accent-main: #3b82f6; 
            --accent-hover: #2563eb; 
            --accent-text: #ffffff;
            --accent-muted: rgba(59, 130, 246, 0.15);
          }
          .theme-light {
            --bg-base: #e2e8f0;
            --bg-surface: #ffffff;
            --bg-card: #f8fafc;
            --bg-card-hover: #f1f5f9;
            --text-primary: #0f172a;
            --text-secondary: #64748b;
            --border-subtle: rgba(0, 0, 0, 0.08);
            --border-strong: rgba(0, 0, 0, 0.2);
            --accent-main: #0ea5e9;
            --accent-hover: #0284c7;
            --accent-text: #ffffff;
            --accent-muted: rgba(14, 165, 233, 0.15);
          }
          .theme-dracula {
            --bg-base: #282a36;
            --bg-surface: #44475a;
            --bg-card: #383a59;
            --bg-card-hover: #6272a4;
            --text-primary: #f8f8f2;
            --text-secondary: #bfcbcf;
            --border-subtle: rgba(248, 248, 242, 0.1);
            --border-strong: rgba(248, 248, 242, 0.25);
            --accent-main: #bd93f9;
            --accent-hover: #ff79c6;
            --accent-text: #282a36;
            --accent-muted: rgba(189, 147, 249, 0.2);
          }
          .theme-sepia {
            --bg-base: #e6dfcc;
            --bg-surface: #f4ecd8;
            --bg-card: #eaddc5;
            --bg-card-hover: #d0c0a6;
            --text-primary: #433422;
            --text-secondary: #7e6551;
            --border-subtle: rgba(91, 70, 54, 0.15);
            --border-strong: rgba(91, 70, 54, 0.3);
            --accent-main: #d97706;
            --accent-hover: #b45309;
            --accent-text: #ffffff;
            --accent-muted: rgba(217, 119, 6, 0.15);
          }
          .theme-hacker {
            --bg-base: #000000;
            --bg-surface: #0a0a0a;
            --bg-card: #111111;
            --bg-card-hover: #222222;
            --text-primary: #22c55e;
            --text-secondary: #166534;
            --border-subtle: #14532d;
            --border-strong: #22c55e;
            --accent-main: #16a34a;
            --accent-hover: #22c55e;
            --accent-text: #000000;
            --accent-muted: rgba(34, 197, 94, 0.15);
          }

          /* CLASSES DE CORES DINÂMICAS */
          .bg-app { background-color: var(--bg-base); }
          .bg-panel { background-color: var(--bg-surface); }
          .bg-card { background-color: var(--bg-card); }
          .hover-bg-card:hover { background-color: var(--bg-card-hover); }
          
          .text-main { color: var(--text-primary); }
          .text-muted { color: var(--text-secondary); }
          .text-accent { color: var(--accent-main); }
          .text-accent-text { color: var(--accent-text); }
          
          .bg-accent { background-color: var(--accent-main); color: var(--accent-text); }
          .hover-bg-accent:hover { background-color: var(--accent-hover); }
          
          .border-subtle { border-color: var(--border-subtle); }
          .border-strong { border-color: var(--border-strong); }
          
          .shadow-accent { box-shadow: 0 4px 20px -2px var(--accent-muted); }
          .ring-accent { --tw-ring-color: var(--accent-main); }
          .accent-accent { accent-color: var(--accent-main); }

          /* ANIMAÇÕES */
          @keyframes popOut3D {
            0% { transform: scale(0.7) rotateY(30deg) rotateX(10deg); opacity: 0; }
            100% { transform: scale(1) rotateY(0deg) rotateX(0deg); opacity: 1; }
          }
          .animate-pop-out { animation: popOut3D 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }

          /* SCROLLBARS */
          .custom-scrollbar::-webkit-scrollbar { width: 5px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-subtle); border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--text-secondary); }
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}
      </style>

      {/* Container do Carrossel */}
      <div
        className="relative w-full max-w-5xl h-[500px] flex items-center justify-center"
        style={{ perspective: "1200px" }}
      >
        {carouselItems.map((item, index) => (
          <div
            key={item.id}
            className={`absolute top-0 left-1/2 -ml-[160px] w-[320px] h-[480px] rounded-2xl overflow-hidden shadow-2xl cursor-pointer flex flex-col bg-card border ${item.isCreator ? "border-dashed border-strong" : "border-subtle"} transition-all hover:ring-2 hover:ring-accent`}
            style={{
              ...getTransformStyles(index),
              transformStyle: "preserve-3d",
              boxShadow:
                index === currentIndex
                  ? "0 0 30px var(--accent-muted)"
                  : "0 10px 30px rgba(0,0,0,0.5)",
            }}
            onClick={() => handleItemClick(index, item)}
          >
            {item.isCreator ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-panel hover-bg-card transition-colors">
                <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mb-6">
                  <Plus size={40} className="text-accent" />
                </div>
                <h2 className="text-2xl font-bold text-main mb-2">
                  {item.title}
                </h2>
                <p className="text-muted text-sm">{item.synopsis}</p>
              </div>
            ) : (
              <div className="relative w-full h-full">
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-panel z-0">
                  <h2 className="text-2xl font-bold text-accent mb-4">
                    {item.title}
                  </h2>
                  <p className="text-muted text-sm">Capa não disponível</p>
                </div>
                {item.src && (
                  <img
                    src={item.src}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10 bg-card"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Controles do Carrossel */}
      <div className="absolute bottom-12 flex gap-6 z-50">
        <button
          onClick={prevItem}
          className="p-4 rounded-full bg-card hover-bg-card border border-subtle text-main transition-all shadow-lg hover:scale-110"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={nextItem}
          className="p-4 rounded-full bg-card hover-bg-card border border-subtle text-main transition-all shadow-lg hover:scale-110"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Telas Sobrepostas (Detalhes ou Leitura) */}
      {expandedItem && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-2 sm:p-4 md:p-10"
          onClick={closeExpandedView}
        >
          {readingChapter &&
          !expandedItem.isSettings &&
          !expandedItem.isCreator ? (
            (() => {
              const chapterIndex = expandedItem.chapters.findIndex(
                (c) => c.id === readingChapter.id,
              );
              const isFirst = chapterIndex === 0;
              const isLast = chapterIndex === expandedItem.chapters.length - 1;

              return (
                // --- TELA DE LEITURA ---
                <div
                  className="w-full h-full bg-app border border-subtle rounded-2xl shadow-2xl flex flex-col p-4 sm:p-6 md:p-10 animate-pop-out overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-4 md:mb-6 border-b border-subtle pb-4 flex-shrink-0 w-full">
                    <button
                      onClick={() => setReadingChapter(null)}
                      className="flex items-center gap-2 text-muted hover:text-main transition-colors text-sm md:text-base font-medium"
                    >
                      <ArrowLeft size={18} className="md:w-5 md:h-5" />
                      <span className="hidden sm:inline">
                        Voltar para Detalhes
                      </span>
                      <span className="sm:hidden">Voltar</span>
                    </button>

                    <div className="flex items-center gap-2 md:gap-3">
                      {!isFirst && (
                        <button
                          onClick={() =>
                            setReadingChapter(
                              expandedItem.chapters[chapterIndex - 1],
                            )
                          }
                          className="flex items-center gap-1 px-3 py-1.5 md:px-4 md:py-2 bg-card hover-bg-card text-main border border-subtle rounded-lg transition-colors font-medium text-xs md:text-sm shadow-sm"
                        >
                          <ChevronLeft size={16} />
                          <span className="hidden sm:inline">Anterior</span>
                        </button>
                      )}

                      {isLast ? (
                        <button className="flex items-center gap-1 px-3 py-1.5 md:px-4 md:py-2 bg-accent hover-bg-accent text-accent-text rounded-lg transition-all font-medium text-xs md:text-sm shadow-accent">
                          <span className="hidden sm:inline">
                            Novo Capítulo
                          </span>
                          <span className="sm:hidden">Novo</span>
                          <Plus size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            setReadingChapter(
                              expandedItem.chapters[chapterIndex + 1],
                            )
                          }
                          className="flex items-center gap-1 px-3 py-1.5 md:px-4 md:py-2 bg-card hover-bg-card text-main border border-subtle rounded-lg transition-colors font-medium text-xs md:text-sm shadow-sm"
                        >
                          <span className="hidden sm:inline">Próximo</span>
                          <ChevronRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ÁREA DE LEITURA */}
                  <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 md:pr-4 w-full max-w-4xl mx-auto">
                    <h1 className="text-3xl md:text-5xl font-bold text-main mb-3 md:mb-6 text-center mt-4 md:mt-8 leading-tight">
                      {readingChapter.title}
                    </h1>
                    <div className="flex items-center justify-center gap-3 md:gap-4 text-xs md:text-sm text-muted mb-8 md:mb-12 pb-6 md:pb-8 border-b border-subtle">
                      <span className="font-medium">
                        Por {readingChapter.author}
                      </span>
                      <span className="opacity-50">•</span>
                      <span>{readingChapter.date}</span>
                    </div>

                    <div
                      className="text-main whitespace-pre-line text-justify pb-16 transition-all duration-300"
                      style={{
                        fontSize: `${settings.reading.fontSize}px`,
                        lineHeight: settings.reading.lineSpacing,
                        fontFamily: settings.reading.fontFamily,
                      }}
                    >
                      {readingChapter.content}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            // --- TELA DE DETALHES OU CONFIGURAÇÕES OU CRIADOR ---
            <div
              className="relative w-full h-full max-w-6xl bg-panel border border-subtle rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-pop-out"
              style={{ transformStyle: "preserve-3d" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Botões Superiores Direito */}
              <div className="absolute top-3 right-3 md:top-4 md:right-4 z-20 flex gap-2">
                <button
                  className={`p-2 rounded-full transition-all backdrop-blur-md border ${coverMode === "full" && !expandedItem.isCreator ? "bg-black/30 hover:bg-black/60 text-white border-white/10" : "bg-card border-subtle hover:border-strong text-main shadow-sm"}`}
                  onClick={closeExpandedView}
                  title="Fechar"
                >
                  <X size={20} className="md:w-6 md:h-6" />
                </button>
              </div>

              {/* Esquerda: Capa Ampliada */}
              {coverMode !== "discreet" && !expandedItem.isCreator && (
                <div
                  className={`
                    ${coverMode === "full" ? "w-full h-full absolute inset-0 z-10" : "w-full md:w-[40%] lg:w-[35%] h-56 sm:h-64 md:h-full relative"}
                    bg-app flex-shrink-0 transition-all duration-500 ease-in-out border-r border-subtle group cursor-pointer overflow-hidden
                  `}
                  onClick={toggleCoverMode}
                  title="Clique para alternar tamanho da capa"
                >
                  <>
                    <div className="absolute inset-0 flex items-center justify-center bg-panel z-0">
                      <span className="text-muted font-bold text-lg md:text-xl text-center px-4">
                        {expandedItem.title}
                      </span>
                    </div>
                    {expandedItem.src && (
                      <img
                        src={expandedItem.src}
                        alt={expandedItem.title}
                        className={`absolute inset-0 w-full h-full ${coverMode === "full" ? "object-contain bg-black/95" : "object-cover"} z-10`}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    )}
                  </>

                  {/* Overlay interativo com ícone de expandir/reduzir */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30`}
                  >
                    <div className="p-4 rounded-full bg-black/60 text-white backdrop-blur-sm border border-white/20">
                      <Maximize2
                        size={32}
                        className={`${coverMode === "full" ? "rotate-180" : ""} transition-transform duration-300`}
                      />
                    </div>
                  </div>

                  {coverMode === "default" && (
                    <div className="absolute inset-x-0 bottom-0 h-32 md:h-48 bg-gradient-to-t from-[var(--bg-surface)] to-transparent md:hidden pointer-events-none z-20"></div>
                  )}
                </div>
              )}

              {/* Direita: Área de Abas e Conteúdo */}
              <div
                className={`
                ${coverMode === "full" && !expandedItem.isCreator ? "hidden" : "flex"}
                ${coverMode === "discreet" || expandedItem.isCreator ? "w-full" : "w-full md:w-[60%] lg:w-[65%]"}
                flex-1 min-h-0 flex-col bg-panel relative p-6 sm:p-8 md:p-10 animate-fade-in overflow-hidden transition-all duration-300
              `}
              >
                {/* Título */}
                <div className="flex items-center gap-4 mb-6 md:mb-8 flex-shrink-0 mt-6 md:mt-0">
                  {coverMode === "discreet" &&
                    expandedItem.src &&
                    !expandedItem.isCreator && (
                      <img
                        src={expandedItem.src}
                        alt={expandedItem.title}
                        className="w-14 h-20 sm:w-16 sm:h-24 object-cover rounded-lg shadow-md border border-subtle flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-accent transition-all"
                        onClick={toggleCoverMode}
                        title="Restaurar tamanho da capa"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    )}
                  <h1 className="text-3xl md:text-5xl font-extrabold text-main leading-tight truncate tracking-tight pr-12">
                    {expandedItem.title}
                  </h1>
                </div>

                {/* Navegação de Abas */}
                <div className="flex gap-6 border-b border-strong mb-6 md:mb-8 relative flex-shrink-0 overflow-x-auto hide-scrollbar">
                  {currentTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`pb-3 text-xs md:text-sm font-bold uppercase tracking-wider transition-colors relative whitespace-nowrap ${
                        activeTab === tab.id
                          ? "text-accent"
                          : "text-muted hover:text-main"
                      }`}
                    >
                      {tab.label}

                      {activeTab === tab.id && (
                        <div
                          className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-accent rounded-t-full shadow-accent"
                          style={{ transition: "all 0.3s ease" }}
                        ></div>
                      )}
                    </button>
                  ))}
                </div>

                {expandedItem.isSettings
                  ? renderSettingsContent()
                  : expandedItem.isCreator
                    ? renderCreatorContent()
                    : renderNovelContent()}

                {/* --- BOTÕES GLOBAIS DO CRIADOR --- */}
                {expandedItem.isCreator && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-subtle flex-shrink-0 mt-4">
                    <button
                      onClick={resetCreator}
                      className="flex-1 flex items-center justify-center gap-2 bg-card text-main border border-subtle hover:border-strong py-3 rounded-xl font-medium transition-all text-sm sm:text-base"
                    >
                      <RotateCcw size={18} />
                      Resetar
                    </button>
                    <button
                      onClick={saveNewLN}
                      className="flex-1 flex items-center justify-center gap-2 bg-accent hover-bg-accent text-accent-text py-3 rounded-xl font-bold transition-all shadow-accent text-sm sm:text-base"
                    >
                      <Save size={18} />
                      Salvar Nova LN
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
