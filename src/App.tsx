/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  CloudRain, 
  Sun, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  ChevronDown,
  Sprout,
  BarChart3,
  CloudSun,
  Camera,
  X,
  MessageSquare,
  Wind,
  Droplets,
  Thermometer,
  ArrowRight,
  Search,
  LogOut,
  Mail,
  Lock,
  RefreshCw,
  ChevronRight,
  Bell,
  Shield,
  User as UserIcon,
  MapPin,
  Navigation,
  Edit3,
  Layout,
  PieChart,
  Activity,
  Calendar,
  Cloud,
  Coins,
  Database,
  Stethoscope,
  Lightbulb,
  ChevronLeft,
  Menu,
  Globe,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Umbrella,
  Gauge,
  Eye,
  Sunrise,
  Sunset,
  Filter,
  Maximize,
  Phone,
  Fingerprint,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User
} from 'firebase/auth';
import { analyzeCropHealth, getMarketInsights, getWeatherData } from './geminiService';
import Markdown from 'react-markdown';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

import { translations, Language } from './translations';

// --- Types ---
type Crop = 'Onion' | 'Tomato' | 'Wheat';
type Tab = 'Dashboard' | 'Market' | 'CropHealth' | 'Profile' | 'Weather';

interface PriceData {
  current: number;
  trend: 'up' | 'down' | 'stable';
  recommendation: 'Sell now' | 'Wait';
  change: string;
  unit?: string;
}

const ErrorDisplay = ({ title, message, resolution, onRetry, t }: { 
  title: string, 
  message: string, 
  resolution: string, 
  onRetry: () => void,
  t: any 
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-6 bg-rose-50 border border-rose-100 rounded-2xl mb-6"
  >
    <div className="flex items-start gap-4">
      <div className="p-2 bg-rose-100 rounded-xl text-rose-600">
        <AlertTriangle size={24} />
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-rose-900 mb-1">{title}</h4>
        <p className="text-sm text-rose-800/80 mb-3">{message}</p>
        <div className="bg-white/50 p-3 rounded-lg border border-rose-200/50 mb-4">
          <p className="text-xs font-bold text-rose-900 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Info size={12} />
            {t('howToFix')}
          </p>
          <p className="text-xs text-rose-800 font-medium leading-relaxed">{resolution}</p>
        </div>
        <button 
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
        >
          <RefreshCw size={14} />
          {t('retry')}
        </button>
      </div>
    </div>
  </motion.div>
);

const CROP_PRICES: Record<Crop, number> = {
  Onion: 25,
  Tomato: 40,
  Wheat: 2200,
};

const CROP_DISEASES: Record<Crop, string[]> = {
  Onion: ['Purple Blotch', 'Downy Mildew', 'Onion Smut'],
  Tomato: ['Early Blight', 'Late Blight', 'Bacterial Spot', 'Leaf Mold'],
  Wheat: ['Leaf Rust', 'Powdery Mildew', 'Loose Smut', 'Leaf Blotch'],
};

// --- Auth Component ---
function Auth({ lang, t, onGuestLogin }: { lang: Language, t: (key: any) => string, onGuestLogin?: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (isLogin) {
        setError("Email or password is incorrect");
      } else {
        if (err.code === 'auth/email-already-in-use') {
          setError("User already exists. Please sign in");
        } else {
          setError(err.message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden"
      >
        <div className="bg-emerald-600 p-8 text-white text-center">
          <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Sprout className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold">{t('appName')}</h2>
          <p className="text-emerald-100 mt-2">{t('tagline')}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-bold rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5" />
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-400 mb-2">{t('emailAddress')}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="name@farm.com"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-400 mb-2">{t('password')}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50"
          >
            {loading ? t('processing') : isLogin ? t('signIn') : t('signUp')}
          </button>

          {onGuestLogin && (
            <>
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-stone-200"></div>
                <span className="flex-shrink mx-4 text-xs font-semibold text-stone-400 uppercase tracking-wider">or</span>
                <div className="flex-grow border-t border-stone-200"></div>
              </div>

              <button 
                type="button"
                onClick={onGuestLogin}
                className="w-full bg-stone-100 hover:bg-emerald-50 text-stone-700 hover:text-emerald-700 border border-stone-200 hover:border-emerald-200 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <span>🌾 {lang === 'hi' ? 'अतिथि के रूप में जारी रखें (डेमो)' : lang === 'mr' ? 'अतिथी म्हणून सुरू ठेवा (डेमो)' : 'Continue as Guest (Demo Mode)'}</span>
              </button>
            </>
          )}

          <p className="text-center text-sm text-stone-500">
            {isLogin ? t('dontHaveAccount') : t('alreadyHaveAccount')}{' '}
            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-emerald-600 font-bold hover:underline"
            >
              {isLogin ? t('signUp') : t('signIn')}
            </button>
          </p>
        </form>
      </motion.div>
    </div>
  );
}

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lang, setLang] = useState<Language>('en');

  const t = (key: keyof typeof translations['en']) => {
    return (translations[lang] as any)[key] || (translations['en'] as any)[key] || key;
  };

  const sidebarItems = [
    { id: 'Dashboard', icon: Layout, label: t('dashboard') },
    { id: 'Market', icon: Coins, label: t('pricePrediction') },
    { id: 'Weather', icon: CloudSun, label: t('weatherForecast') },
    { id: 'CropHealth', icon: Stethoscope, label: t('cropHealth') },
    { id: 'Profile', icon: UserIcon, label: t('profile') },
  ];

  const [selectedCrop, setSelectedCrop] = useState<Crop>('Onion');
  const [prediction, setPrediction] = useState<any>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const priceHistoryData = [
    { day: t('mon'), price: (prediction?.current || CROP_PRICES[selectedCrop]) * 0.95 },
    { day: t('tue'), price: (prediction?.current || CROP_PRICES[selectedCrop]) * 0.98 },
    { day: t('wed'), price: (prediction?.current || CROP_PRICES[selectedCrop]) * 0.96 },
    { day: t('thu'), price: (prediction?.current || CROP_PRICES[selectedCrop]) * 1.02 },
    { day: t('fri'), price: (prediction?.current || CROP_PRICES[selectedCrop]) * 1.05 },
    { day: t('sat'), price: (prediction?.current || CROP_PRICES[selectedCrop]) * 1.03 },
    { day: t('sun'), price: (prediction?.current || CROP_PRICES[selectedCrop]) },
  ];

  const getMarketPrediction = async () => {
    handlePredict();
  };
  const [weather, setWeather] = useState<'Rain' | 'Dry'>('Dry');
  
  // Crop Health State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [healthResult, setHealthResult] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = async () => {
    if (!selectedImage) return;
    analyzeHealth(selectedImage);
  };

  // Farmer Profile State
  const [profile, setProfile] = useState({
    name: 'Ramesh Patil',
    age: '42',
    mobile: '+91 98765 43210',
    village: 'Pimpalner',
    district: 'Dhule',
    state: 'Maharashtra',
    landSize: '5',
    cropTypes: ['Onion', 'Tomato'],
    irrigationType: 'Drip',
    preferredCrop: 'Onion',
    primaryCrop: 'Wheat',
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempProfile, setTempProfile] = useState(profile);
  const [showProfileToast, setShowProfileToast] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setProfile(tempProfile);
    setIsEditingProfile(false);
    setShowProfileToast(true);
    setTimeout(() => setShowProfileToast(false), 3000);
    setIsUpdatingProfile(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Passwords don't match");
      return;
    }
    setIsUpdatingProfile(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setNewPassword('');
    setConfirmPassword('');
    setShowProfileToast(true);
    setTimeout(() => setShowProfileToast(false), 3000);
    setIsUpdatingProfile(false);
  };

  const [preferredRegion, setPreferredRegion] = useState('Nashik');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<string | null>(null);

  const handleDetectLocation = async () => {
    if (!navigator.geolocation) {
      return;
    }

    setIsDetectingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
          );
          const data = await response.json();
          
          const locationName = data.address.city || data.address.town || data.address.village || data.address.county || 'Unknown';
          
          setDetectedLocation(locationName);
          setPreferredRegion(locationName);
          
          if (isEditingProfile) {
            setTempProfile(prev => ({ ...prev, district: locationName }));
          }
        } catch (error) {
          console.error("Geocoding error:", error);
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsDetectingLocation(false);
      }
    );
  };

  // Market State
  const [marketSearch, setMarketSearch] = useState('');
  const [marketCategory, setMarketCategory] = useState('All Crops');
  const [marketInsights, setMarketInsights] = useState<any | null>(null);
  const [marketData, setMarketData] = useState<any[]>([]);
  const [marketError, setMarketError] = useState<{type: 'network' | 'quota' | 'generic', message: string, resolution: string} | null>(null);

  // Weather State
  const [weatherInsights, setWeatherInsights] = useState<any | null>(null);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState<{type: 'network' | 'quota' | 'generic', message: string, resolution: string} | null>(null);

  // Crop Health State
  const [healthError, setHealthError] = useState<{type: 'network' | 'quota' | 'image' | 'generic', message: string, resolution: string} | null>(null);

  const [langChangeEffect, setLangChangeEffect] = useState(0); // Dummy state to trigger re-renders if needed

  useEffect(() => {
    const savedLang = localStorage.getItem('app-lang') as Language;
    if (savedLang && translations[savedLang]) {
      setLang(savedLang);
    } else {
      const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'hi' || browserLang === 'mr') {
        setLang(browserLang as Language);
      }
    }
  }, []);

  const handleLangChange = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('app-lang', newLang);
    setLangChangeEffect(prev => prev + 1);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchWeather();
      handlePredict();
    }
  }, [user, preferredRegion, selectedCrop]);

  const handleLogout = async () => {
    await signOut(auth);
    setActiveTab('Dashboard');
  };

  const handlePredict = async () => {
    setIsPredicting(true);
    setPrediction(null);
    setMarketInsights(null);
    setMarketError(null);
    
    try {
      const data = await getMarketInsights(selectedCrop, preferredRegion, lang);
      setMarketInsights(data);
      setMarketData(data.rawData?.records || []);
      
      setPrediction({
        current: data.currentPrice,
        trend: data.trend as 'up' | 'down' | 'stable',
        recommendation: data.recommendation as 'Sell now' | 'Wait',
        change: data.changePercentage,
        unit: data.unit
      });
    } catch (error: any) {
      console.error("Error fetching market insights:", error);
      if (error.message?.toLowerCase().includes('network') || !navigator.onLine) {
        setMarketError({ type: 'network', message: t('errorNetwork'), resolution: t('resolutionNetwork') });
      } else if (error.message?.toLowerCase().includes('quota') || error.message?.includes('429')) {
        setMarketError({ type: 'quota', message: t('errorQuota'), resolution: t('resolutionQuota') });
      } else {
        setMarketError({ type: 'generic', message: t('errorMarket'), resolution: t('resolutionGeneric') });
      }
    } finally {
      setIsPredicting(false);
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setUploadedImage(base64);
        analyzeHealth(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeHealth = async (base64: string) => {
    setIsAnalyzing(true);
    setHealthResult(null);
    setHealthError(null);
    
    try {
      const result = await analyzeCropHealth(base64, selectedCrop, lang);
      setHealthResult(result);
    } catch (error: any) {
      console.error("Error analyzing crop health:", error);
      if (error.message?.toLowerCase().includes('network') || !navigator.onLine) {
        setHealthError({ type: 'network', message: t('errorNetwork'), resolution: t('resolutionNetwork') });
      } else if (error.message?.toLowerCase().includes('quota') || error.message?.includes('429')) {
        setHealthError({ type: 'quota', message: t('errorQuota'), resolution: t('resolutionQuota') });
      } else if (error.message?.toLowerCase().includes('image') || error.message?.toLowerCase().includes('invalid')) {
        setHealthError({ type: 'image', message: t('errorImage'), resolution: t('resolutionImage') });
      } else {
        setHealthError({ type: 'generic', message: t('errorImage'), resolution: t('resolutionGeneric') });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fetchWeather = async () => {
    setIsFetchingWeather(true);
    setWeatherError(null);
    try {
      const insights = await getWeatherData(preferredRegion, lang);
      setWeatherInsights(insights);
    } catch (error: any) {
      console.error("Error fetching weather data:", error);
      if (error.message?.toLowerCase().includes('network') || !navigator.onLine) {
        setWeatherError({ type: 'network', message: t('errorNetwork'), resolution: t('resolutionNetwork') });
      } else if (error.message?.toLowerCase().includes('quota') || error.message?.includes('429')) {
        setWeatherError({ type: 'quota', message: t('errorQuota'), resolution: t('resolutionQuota') });
      } else {
        setWeatherError({ type: 'generic', message: t('errorWeather'), resolution: t('resolutionGeneric') });
      }
    } finally {
      setIsFetchingWeather(false);
    }
  };

  const resetHealth = () => {
    setUploadedImage(null);
    setHealthResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  const handleGuestLogin = () => {
    setUser({
      uid: 'demo-farmer-01',
      email: 'farmer@agrismart.local',
      displayName: 'Ramesh Patel',
    } as any);
  };

  if (!user) {
    return <Auth lang={lang} t={t} onGuestLogin={handleGuestLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex">
      {/* Sidebar - Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:static lg:inset-0`}>
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
              <Sprout className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">AgriSmart AI</span>
          </div>
          
          <nav className="flex-1 px-4 py-4 space-y-2">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as Tab);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === item.id 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              {t('logout')}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-slate-900">{t('helloFarmer')} 👋</h2>
              <p className="text-xs md:text-sm text-slate-500 font-medium">{t('welcomeBack')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            {/* Language Switcher */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-all">
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">{lang === 'en' ? 'English' : lang === 'hi' ? 'हिंदी' : 'मराठी'}</span>
                <span className="sm:hidden uppercase">{lang}</span>
              </button>
              <div className="absolute right-0 mt-2 w-32 bg-white border border-slate-200 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                {(['en', 'hi', 'mr'] as Language[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => handleLangChange(l)}
                    className={`w-full text-left px-4 py-3 text-xs font-bold hover:bg-emerald-50 transition-colors ${lang === l ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600'}`}
                  >
                    {l === 'en' ? 'English' : l === 'hi' ? 'हिंदी' : 'मराठी'}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-10 w-[1px] bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-bold text-slate-900">{profile.name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{profile.district}</p>
              </div>
              <button 
                onClick={() => setActiveTab('Profile')}
                className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border-2 border-emerald-50 hover:scale-105 transition-transform"
              >
                {profile.name[0]}
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 lg:pb-8">
          <AnimatePresence mode="wait">
            {activeTab === 'Dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Location Card */}
                  <div className="glass p-6 rounded-3xl card-shadow flex items-center gap-4">
                    <div className="bg-emerald-100 p-4 rounded-2xl text-emerald-600">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('location')}</p>
                      <h3 className="text-xl font-bold text-slate-900">{t(preferredRegion.toLowerCase() as any)}</h3>
                    </div>
                  </div>

                  {/* Crop Price Card */}
                  <div className="glass p-6 rounded-3xl card-shadow flex items-center gap-4">
                    <div className="bg-blue-100 p-4 rounded-2xl text-blue-600">
                      <Coins className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('currentPrice')}</p>
                      <div className="flex items-baseline gap-1">
                        <h3 className="text-xl font-bold text-slate-900">₹{prediction?.current || CROP_PRICES[selectedCrop]}</h3>
                        <span className="text-xs text-slate-400">/{prediction?.unit || (selectedCrop === 'Wheat' ? 'q' : 'kg')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Weather Card */}
                  <div className="glass p-6 rounded-3xl card-shadow flex items-center justify-between gap-4 group">
                    <div className="flex items-center gap-4">
                      <div className="bg-amber-100 p-4 rounded-2xl text-amber-600 group-hover:scale-110 transition-transform">
                        <CloudSun className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('weather')}</p>
                        <h3 className="text-xl font-bold text-slate-900">32°C, {t('partlyCloudy')}</h3>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('Weather')}
                      className="p-2 text-stone-400 hover:text-emerald-600 transition-colors"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Crop Health Card */}
                  <div className="glass p-8 rounded-[2rem] card-shadow">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-500 p-2 rounded-xl">
                          <Stethoscope className="text-white w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">{t('cropHealth')}</h3>
                      </div>
                      <button 
                        onClick={() => setActiveTab('CropHealth')}
                        className="text-xs font-bold text-emerald-600 hover:underline"
                      >
                        {t('viewDetails')}
                      </button>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                      <Camera className="w-12 h-12 text-slate-300 mb-4" />
                      <p className="text-slate-500 font-medium text-center mb-6">{t('uploadImagePlaceholder')}</p>
                      <button 
                        onClick={() => setActiveTab('CropHealth')}
                        className="bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                      >
                        {t('detectNow')}
                      </button>
                    </div>
                  </div>

                  {/* AI Recommendation Card */}
                  <div className="glass p-8 rounded-[2rem] card-shadow">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-500 p-2 rounded-xl">
                          <Lightbulb className="text-white w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">{t('aiRecommendation')}</h3>
                      </div>
                      <button 
                        onClick={() => setActiveTab('Market')}
                        className="text-xs font-bold text-emerald-600 hover:underline"
                      >
                        {t('viewDetails')}
                      </button>
                    </div>

                    <div className="space-y-6">
                      <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <p className="text-sm font-bold text-emerald-800 uppercase tracking-wider">{t('marketInsight')}</p>
                        </div>
                        <p className="text-emerald-900/70 text-sm leading-relaxed">
                          {t('marketTrendsDesc')}
                        </p>
                      </div>

                      <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <p className="text-sm font-bold text-blue-800 uppercase tracking-wider">{t('weatherAlert')}</p>
                        </div>
                        <p className="text-blue-900/70 text-sm leading-relaxed">
                          {t('weatherConditionsDesc')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          {activeTab === 'CropHealth' && (
            <motion.div
              key="crophealth"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <header className="mb-6 md:mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-stone-900" data-i18n="cropHealthDetection">{t('cropHealthDetection')}</h2>
                <p className="text-stone-500 mt-1 text-sm md:text-base" data-i18n="cropHealthDesc">{t('cropHealthDesc')}</p>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  {/* Upload Card */}
                  <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="font-bold text-stone-800 text-lg" data-i18n="uploadImage">{t('uploadImage')}</h3>
                      <div className="bg-emerald-50 p-2 rounded-lg">
                        <Camera className="text-emerald-600 w-5 h-5" />
                      </div>
                    </div>

                    <div 
                      className={`relative group border-2 border-dashed rounded-3xl p-10 transition-all flex flex-col items-center justify-center text-center ${
                        selectedImage ? 'border-emerald-200 bg-emerald-50/30' : 'border-stone-200 hover:border-emerald-400 bg-stone-50/50'
                      }`}
                    >
                      {selectedImage ? (
                        <div className="relative w-full max-w-xs aspect-square rounded-2xl overflow-hidden shadow-2xl">
                          <img src={selectedImage} alt="Crop" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button 
                            onClick={() => setSelectedImage(null)}
                            className="absolute top-2 right-2 p-2 bg-rose-500 text-white rounded-xl shadow-lg hover:bg-rose-600 transition-all"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="p-6 bg-white rounded-full shadow-xl shadow-stone-200 mb-6 group-hover:scale-110 transition-transform">
                            <Upload className="w-10 h-10 text-emerald-500" />
                          </div>
                          <p className="text-stone-800 font-bold mb-2" data-i18n="clickToUpload">{t('clickToUpload')}</p>
                          <p className="text-stone-400 text-xs font-medium" data-i18n="supports">{t('supports')}</p>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        disabled={isAnalyzing}
                      />
                    </div>

                    <div className="mt-8 grid grid-cols-3 gap-4">
                      <div className="p-4 bg-stone-50 rounded-2xl text-center">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                          <Info className="w-4 h-4 text-emerald-500" />
                        </div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider" data-i18n="step1">{t('step1')}</p>
                        <p className="text-[11px] font-bold text-stone-800">{t('step1Desc')}</p>
                      </div>
                      <div className="p-4 bg-stone-50 rounded-2xl text-center">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                          <Activity className="w-4 h-4 text-blue-500" />
                        </div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider" data-i18n="step2">{t('step2')}</p>
                        <p className="text-[11px] font-bold text-stone-800">{t('step2Desc')}</p>
                      </div>
                      <div className="p-4 bg-stone-50 rounded-2xl text-center">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                          <CheckCircle2 className="w-4 h-4 text-amber-500" />
                        </div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider" data-i18n="step3">{t('step3')}</p>
                        <p className="text-[11px] font-bold text-stone-800">{t('step3Desc')}</p>
                      </div>
                    </div>

                    <button 
                      onClick={handleAnalyze}
                      disabled={!selectedImage || isAnalyzing}
                      className="w-full mt-8 bg-stone-900 text-white py-5 rounded-2xl font-bold text-sm hover:bg-stone-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-stone-200 disabled:opacity-50"
                    >
                      {isAnalyzing ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Sparkles className="w-5 h-5" />
                      )}
                      <span data-i18n="analyzeCrop">{t('analyzeCrop')}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Diagnosis Card */}
                  <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
                    <div className="p-8 border-b border-stone-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-50 p-2 rounded-lg">
                          <CheckCircle2 className="text-emerald-600 w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-stone-800 text-lg" data-i18n="aiDiagnosis">{t('aiDiagnosis')}</h3>
                      </div>
                      {healthResult && (
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          healthResult.status?.toLowerCase().includes('healthy') ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {healthResult.status?.toLowerCase().includes('healthy') ? t('healthy') : t('diseaseDetected')}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 p-8">
                      <AnimatePresence mode="wait">
                        {healthError && (
                          <ErrorDisplay 
                            title={t('errorTitle')}
                            message={healthError.message}
                            resolution={healthError.resolution}
                            onRetry={handleAnalyze}
                            t={t}
                          />
                        )}
                        {healthResult ? (
                          <motion.div 
                            key="result"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                          >
                            <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                              <div className={`p-3 rounded-xl ${healthResult.status?.toLowerCase().includes('healthy') ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                {healthResult.status?.toLowerCase().includes('healthy') ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{t('status')}</p>
                                <p className="font-bold text-stone-900">{healthResult.status}</p>
                              </div>
                            </div>

                            {healthResult.diseaseName && healthResult.diseaseName !== 'N/A' && (
                              <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl">
                                <h4 className="font-bold text-rose-900 mb-2 flex items-center gap-2">
                                  <Stethoscope size={18} />
                                  {healthResult.diseaseName}
                                </h4>
                                <div className="space-y-4">
                                  <div>
                                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">{t('symptoms')}</p>
                                    <p className="text-sm text-rose-800 leading-relaxed">{healthResult.symptoms}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">{t('treatment')}</p>
                                    <p className="text-sm text-rose-800 leading-relaxed font-medium">{healthResult.treatment}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">{t('prevention')}</p>
                                    <p className="text-sm text-rose-800 leading-relaxed">{healthResult.prevention}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {healthResult.status?.toLowerCase().includes('healthy') && (
                              <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                <h4 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
                                  <Sparkles size={18} />
                                  {t('healthyCrop')}
                                </h4>
                                <p className="text-sm text-emerald-800 leading-relaxed">{healthResult.prevention || t('continueBestPractices')}</p>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                              <span className="text-xs font-bold text-stone-400">{t('confidence')}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-emerald-500 rounded-full" 
                                    style={{ width: `${(healthResult.confidence || 0) * 100}%` }}
                                  />
                                </div>
                                <span className="text-xs font-black text-stone-900">{Math.round((healthResult.confidence || 0) * 100)}%</span>
                              </div>
                            </div>
                          </motion.div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center text-stone-400">
                            <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mb-4">
                              <Search className="w-8 h-8 opacity-20" />
                            </div>
                            <p className="text-sm font-medium" data-i18n="uploadImagePlaceholder">{t('uploadImagePlaceholder')}</p>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>

                    {healthResult && (
                      <div className="p-6 bg-stone-50 border-t border-stone-100">
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest text-center italic leading-relaxed">
                          {t('aiDiagnosisDisclaimer')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Recent Scans */}
                  <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8">
                    <h3 className="font-bold text-stone-800 mb-6" data-i18n="recentScans">{t('recentScans')}</h3>
                    <div className="space-y-4">
                      {[
                        { crop: 'Onion', date: 'Oct 12, 2023', status: 'Healthy' },
                        { crop: 'Tomato', date: 'Oct 10, 2023', status: 'Early Blight' },
                      ].map((scan, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-all cursor-pointer group">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                              <Sprout className="text-emerald-500 w-6 h-6" />
                            </div>
                            <div>
                              <p className="font-bold text-stone-800 text-sm">{scan.crop}</p>
                              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{scan.date}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                            scan.status === 'Healthy' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {scan.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'Market' && (
            <motion.div 
              key="market"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl md:text-[19px] font-bold text-stone-900" data-i18n="marketInsights">{t('marketInsights')}</h2>
                  <p className="text-stone-500 mt-1 text-sm md:text-base" data-i18n="marketTrendsDesc">{t('marketTrendsDesc')}</p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                  <TrendingUp className="text-emerald-600 w-4 h-4" />
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">{t(preferredRegion.toLowerCase() as any)}</span>
                </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Controls & Prediction */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Local Market Prices Card */}
                  <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-stone-800" data-i18n="localMarketPrices">{t('localMarketPrices')}</h3>
                      <MapPin className="text-emerald-600 w-5 h-5" />
                    </div>
                    
                    {!detectedLocation ? (
                      <button 
                        onClick={handleDetectLocation}
                        disabled={isDetectingLocation}
                        className={`w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border-2 ${
                          isDetectingLocation
                            ? 'bg-stone-50 text-stone-400 border-stone-100 cursor-not-allowed'
                            : 'bg-emerald-600 text-white border-emerald-600 hover:bg-white hover:text-emerald-600 shadow-lg shadow-emerald-100 active:scale-[0.98]'
                        }`}
                      >
                        {isDetectingLocation ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Navigation className="w-4 h-4" />
                        )}
                        <span data-i18n="detectLocation">{isDetectingLocation ? t('detecting') || 'Detecting...' : t('detectLocation')}</span>
                      </button>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                          <span className="text-sm font-bold text-emerald-800" data-i18n="yourLocation">{t('yourLocation')}:</span>
                          <span className="text-sm font-black text-emerald-900 flex items-center gap-1">
                            {t(detectedLocation.toLowerCase() as any)} 📍
                          </span>
                        </div>

                        {marketInsights?.cedaError && (
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col gap-2 shadow-sm">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="text-amber-600 w-5 h-5 flex-shrink-0" />
                              <p className="text-xs font-bold text-amber-900">CEDA API Configuration Required</p>
                            </div>
                            <p className="text-[10px] font-medium text-amber-800 leading-relaxed">
                              {marketInsights.cedaError}
                            </p>
                            <a 
                              href="https://ceda.ashoka.edu.in/agriculture-data/" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[10px] font-bold text-amber-700 underline hover:text-amber-900 transition-colors"
                            >
                              Learn more about CEDA data →
                            </a>
                          </div>
                        )}

                        <div className="space-y-3">
                          {[
                            { name: 'Onion', price: 22, unit: '/kg' },
                            { name: 'Tomato', price: 18, unit: '/kg' },
                            { name: 'Wheat', price: 25, unit: '/kg' },
                          ].map((crop) => (
                            <div key={crop.name} className="flex justify-between items-center p-3 bg-stone-50 rounded-lg border border-stone-100">
                              <span className="text-sm font-bold text-stone-700">{t(crop.name.toLowerCase() as any)}</span>
                              <span className="text-sm font-black text-stone-900">₹{crop.price}{crop.unit}</span>
                            </div>
                          ))}
                        </div>

                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-1">
                          <p className="text-xs font-bold text-blue-800" data-i18n="pricesInDhuleStable">{t('pricesInDhuleStable')}</p>
                          <p className="text-[10px] text-blue-600 font-medium" data-i18n="waitForBetterPrices">{t('waitForBetterPrices')}</p>
                        </div>

                        <div className="pt-4 border-t border-stone-100">
                          <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4" data-i18n="nearbyCitiesComparison">{t('nearbyCitiesComparison')}</h4>
                          <div className="space-y-3">
                            {[
                              { city: 'Nashik', price: 25, unit: '/kg' },
                              { city: 'Pune', price: 20, unit: '/kg' },
                            ].map((item) => (
                              <div key={item.city} className="flex justify-between items-center">
                                <span className="text-sm font-medium text-stone-600">{t(item.city.toLowerCase() as any)}</span>
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-black ${item.price > 22 ? 'text-emerald-600' : 'text-stone-800'}`}>
                                    ₹{item.price}{item.unit}
                                  </span>
                                  {item.price > 22 && (
                                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase" data-i18n="bestPrice">{t('bestPrice')}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                    <h3 className="font-bold text-stone-800 mb-4" data-i18n="selectCrop">{t('selectCrop')}</h3>
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      {(['Onion', 'Tomato', 'Wheat'] as Crop[]).map((crop) => (
                        <button
                          key={crop}
                          onClick={() => setSelectedCrop(crop)}
                          className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border ${
                            selectedCrop === crop 
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100' 
                              : 'bg-stone-50 text-stone-600 border-stone-100 hover:border-stone-200'
                          }`}
                        >
                          {t(crop.toLowerCase() as any)}
                        </button>
                      ))}
                    </div>

                    {prediction && (
                      <div className="p-4 rounded-xl bg-stone-50 border border-stone-100">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider" data-i18n="predictedPrice">{t('predictedPrice')}</span>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${
                            prediction.trend === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {prediction.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {prediction.change}
                          </div>
                        </div>
                        <div className="flex items-baseline gap-2 mb-4">
                          <span className="text-3xl font-bold text-stone-800">₹{prediction.current}{prediction.unit ? `/${prediction.unit}` : ''}</span>
                        </div>
                        <div className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                          prediction.recommendation === 'Sell now' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          <Info size={14} />
                          {t(prediction.recommendation.toLowerCase().replace(' ', '') as any)}
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={getMarketPrediction}
                      disabled={isPredicting}
                      className={`w-full mt-6 py-4 rounded-xl font-mono font-bold text-sm transition-all flex items-center justify-center gap-2 border-2 ${
                        isPredicting 
                          ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed' 
                          : 'bg-stone-900 text-white border-transparent hover:bg-white hover:text-stone-900 hover:border-stone-900 shadow-lg shadow-stone-200 active:scale-[0.98]'
                      }`}
                    >
                      {isPredicting ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <BarChart3 className="w-4 h-4" />
                      )}
                      <span data-i18n="getAiInsights">{isPredicting ? t('analyzing') || 'Analyzing...' : t('getAiInsights')}</span>
                    </button>
                  </div>
                </div>

                {/* Right Column: Chart & Insights */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-stone-800" data-i18n="priceHistory">{t('priceHistory')}</h3>
                      <div className="flex gap-2">
                        <button className="px-3 py-1 text-[10px] font-bold bg-stone-100 text-stone-600 rounded-full">7D</button>
                        <button className="px-3 py-1 text-[10px] font-bold text-stone-400 rounded-full">1M</button>
                      </div>
                    </div>
                    <div className="h-[240px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={priceHistoryData}>
                          <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                          <XAxis 
                            dataKey="day" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 10, fontWeight: 600, fill: '#a8a29e'}}
                            dy={10}
                          />
                          <YAxis 
                            hide 
                            domain={['dataMin - 5', 'dataMax + 5']}
                          />
                          <Tooltip 
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                            labelStyle={{fontWeight: 700, marginBottom: '4px'}}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="price" 
                            stroke="#10b981" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorPrice)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {marketError && (
                    <ErrorDisplay 
                      title={t('errorTitle')}
                      message={marketError.message}
                      resolution={marketError.resolution}
                      onRetry={handlePredict}
                      t={t}
                    />
                  )}

                  {marketInsights && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-8 rounded-3xl bg-emerald-50 border border-emerald-100 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Sparkles size={80} className="text-emerald-600" />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6 text-emerald-700">
                          <div className="bg-emerald-100 p-2 rounded-lg">
                            <CheckCircle2 size={24} />
                          </div>
                          <h4 className="text-lg font-bold" data-i18n="aiMarketAnalysis">{t('aiMarketAnalysis')}</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                          <div className="p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-emerald-100 shadow-sm">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">{t('marketArrivals')}</p>
                            <p className="text-sm font-bold text-emerald-900">{marketInsights.marketArrivals}</p>
                          </div>
                          <div className="p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-emerald-100 shadow-sm">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">{t('recommendation')}</p>
                            <p className="text-sm font-bold text-emerald-900">{marketInsights.recommendation}</p>
                          </div>
                        </div>

                        <div className="prose prose-stone prose-sm max-w-none text-emerald-900/80 leading-relaxed">
                          <Markdown>{marketInsights.insights}</Markdown>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {marketData.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2 text-stone-800">
                          <Database size={20} className="text-stone-400" />
                          <h4 className="font-bold">Recent Mandi Records</h4>
                        </div>
                        <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Source: {marketInsights?.rawData?.source || 'CEDA Ashoka'}</span>
                      </div>
                      <div className="overflow-x-auto -mx-6 px-6">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="border-b border-stone-100">
                              <th className="pb-4 font-bold text-stone-400 uppercase tracking-wider text-[10px] market-table-header">Market</th>
                              <th className="pb-4 font-bold text-stone-400 uppercase tracking-wider text-[10px] market-table-header">District</th>
                              <th className="pb-4 font-bold text-stone-400 uppercase tracking-wider text-[10px] market-table-header">Variety</th>
                              <th className="pb-4 font-bold text-stone-400 uppercase tracking-wider text-[10px] text-right market-table-header">Price (Modal)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-50">
                            {marketData.map((record, idx) => (
                              <tr key={idx} className="market-table-row transition-colors group">
                                <td className="py-4 font-medium text-stone-700">{record.market}</td>
                                <td className="py-4 text-stone-500">{record.district}</td>
                                <td className="py-4 text-stone-500">{record.variety}</td>
                                <td className="py-4 font-bold text-stone-900 text-right market-table-value">₹{record.modal_price}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Market Table */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h3 className="font-bold text-stone-800" data-i18n="marketTrends">{t('marketTrends')}</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                    <input 
                      type="text" 
                      value={marketSearch}
                      onChange={(e) => setMarketSearch(e.target.value)}
                      placeholder={t('searchCrops')}
                      className="pl-10 pr-4 py-2 bg-stone-50 border border-stone-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-full md:w-64"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px] md:min-w-full">
                    <thead>
                      <tr className="bg-stone-50 text-stone-400 text-[10px] md:text-xs uppercase tracking-wider font-bold">
                        <th className="px-4 md:px-6 py-4 market-table-header" data-i18n="cropName">{t('cropName')}</th>
                        <th className="px-4 md:px-6 py-4 market-table-header" data-i18n="price">{t('price')}</th>
                        <th className="px-4 md:px-6 py-4 market-table-header" data-i18n="change24h">{t('change24h')}</th>
                        <th className="px-4 md:px-6 py-4 hidden sm:table-cell market-table-header" data-i18n="demand">{t('demand')}</th>
                        <th className="px-4 md:px-6 py-4 market-table-header" data-i18n="region">{t('region')}</th>
                        <th className="px-4 md:px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {[
                        { name: 'Onion', key: 'onion', price: '₹25/kg', change: '+2.4%', demand: 'High', region: 'Nashik', regionKey: 'nashik', type: 'Vegetables' },
                        { name: 'Tomato', key: 'tomato', price: '₹40/kg', change: '-1.2%', demand: 'Medium', region: 'Bangalore', regionKey: 'bangalore', type: 'Vegetables' },
                        { name: 'Wheat', key: 'wheat', price: '₹2,200/q', change: '+0.8%', demand: 'Stable', region: 'Punjab', regionKey: 'punjab', type: 'Grains' },
                        { name: 'Potato', key: 'potato', price: '₹18/kg', change: '+5.1%', demand: 'High', region: 'Agra', regionKey: 'agra', type: 'Vegetables' },
                        { name: 'Rice', key: 'rice', price: '₹3,500/q', change: '-0.3%', demand: 'Stable', region: 'Andhra', regionKey: 'andhra', type: 'Grains' },
                      ]
                      .filter(item => 
                        (marketCategory === 'All Crops' || item.type === marketCategory) &&
                        (item.name.toLowerCase().includes(marketSearch.toLowerCase()) || item.region.toLowerCase().includes(marketSearch.toLowerCase()))
                      )
                      .map((item, i) => (
                        <tr key={i} className="market-table-row transition-colors group">
                          <td className="px-4 md:px-6 py-4 font-bold text-stone-800 text-sm md:text-base">{t(item.key as any)}</td>
                          <td className="px-4 md:px-6 py-4 market-table-value text-sm">{item.price}</td>
                          <td className={`px-4 md:px-6 py-4 font-bold text-sm ${item.change.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {item.change}
                          </td>
                          <td className="px-4 md:px-6 py-4 hidden sm:table-cell">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              item.demand === 'High' ? 'bg-emerald-100 text-emerald-700' : 
                              item.demand === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {item.demand === 'High' ? t('high') : item.demand === 'Medium' ? t('medium') : t('stable')}
                            </span>
                          </td>
                          <td className="px-4 md:px-6 py-4 text-stone-500 text-xs md:text-sm">{t(item.regionKey as any)}</td>
                          <td className="px-4 md:px-6 py-4 text-right">
                            <button className="p-2 text-stone-400 hover:text-emerald-600 transition-colors">
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'Weather' && (
            <motion.div
              key="weather"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-stone-900" data-i18n="weatherForecast">{t('weatherForecast')}</h2>
                  <p className="text-stone-500 mt-1 text-sm md:text-base" data-i18n="weatherDesc">{t('weatherDesc')}</p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                  <MapPin className="text-emerald-600 w-4 h-4" />
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">{t(preferredRegion.toLowerCase() as any)}</span>
                </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Current Weather Card */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
                    <div className="p-8 md:p-10 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white relative overflow-hidden">
                      {/* Decorative background elements */}
                      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl"></div>
                      
                      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                          <div className="p-4 bg-white/20 backdrop-blur-md rounded-3xl border border-white/30">
                            <CloudSun className="w-16 h-16 md:w-20 md:h-20 text-white" />
                          </div>
                          <div>
                            <div className="flex items-baseline gap-1">
                              <h3 className="text-6xl md:text-8xl font-black tracking-tighter">
                                {weatherInsights?.current?.temp || 32}°
                              </h3>
                              <span className="text-2xl md:text-3xl font-bold opacity-60">C</span>
                            </div>
                            <p className="text-lg md:text-xl font-bold opacity-90 mt-1">
                              {weatherInsights?.current?.condition || t('partlyCloudy')}
                            </p>
                            <div className="flex items-center gap-4 mt-4 text-sm font-medium opacity-80">
                              <span className="flex items-center gap-1">
                                <ArrowUp size={14} /> {weatherInsights?.current?.high || 34}°
                              </span>
                              <span className="flex items-center gap-1">
                                <ArrowDown size={14} /> {weatherInsights?.current?.low || 26}°
                              </span>
                              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-lg">
                                {t('feelsLike')} {weatherInsights?.current?.feelsLike || 35}°
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-center md:items-end gap-2">
                          <button 
                            onClick={fetchWeather}
                            disabled={isFetchingWeather}
                            className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl border border-white/30 transition-all disabled:opacity-50"
                          >
                            <RefreshCw className={`w-6 h-6 ${isFetchingWeather ? 'animate-spin' : ''}`} />
                          </button>
                          <p className="text-xs font-bold uppercase tracking-widest opacity-60 mt-2">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-6">
                      {[
                        { icon: Droplets, label: 'humidity', value: weatherInsights?.current?.humidity || '64%', color: 'text-blue-500', bg: 'bg-blue-50' },
                        { icon: Wind, label: 'windSpeed', value: weatherInsights?.current?.windSpeed || '12 km/h', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                        { icon: Sun, label: 'uvIndex', value: weatherInsights?.current?.uvIndex || 'High', color: 'text-amber-500', bg: 'bg-amber-50' },
                        { icon: Umbrella, label: 'chanceOfRain', value: weatherInsights?.current?.chanceOfRain || '10%', color: 'text-indigo-500', bg: 'bg-indigo-50' },
                        { icon: Gauge, label: 'pressure', value: weatherInsights?.current?.pressure || '1012 hPa', color: 'text-stone-500', bg: 'bg-stone-50' },
                        { icon: Eye, label: 'visibility', value: weatherInsights?.current?.visibility || '10 km', color: 'text-stone-500', bg: 'bg-stone-50' },
                        { icon: Sunrise, label: 'sunrise', value: weatherInsights?.current?.sunrise || '06:12 AM', color: 'text-orange-500', bg: 'bg-orange-50' },
                        { icon: Sunset, label: 'sunset', value: weatherInsights?.current?.sunset || '06:45 PM', color: 'text-rose-500', bg: 'bg-rose-50' },
                      ].map((stat, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                            <stat.icon size={20} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider" data-i18n={stat.label}>{t(stat.label as any)}</p>
                            <p className="font-bold text-stone-800 text-sm">{stat.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {weatherError && (
                    <ErrorDisplay 
                      title={t('errorTitle')}
                      message={weatherError.message}
                      resolution={weatherError.resolution}
                      onRetry={fetchWeather}
                      t={t}
                    />
                  )}

                  <button 
                    onClick={fetchWeather}
                    disabled={isFetchingWeather}
                    className="w-full bg-stone-900 text-white py-5 rounded-2xl font-bold text-sm hover:bg-stone-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-stone-200 disabled:opacity-50"
                  >
                    {isFetchingWeather ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <CloudSun className="w-5 h-5" />
                    )}
                    <span data-i18n="getAiForecast">{t('getAiForecast')}</span>
                  </button>

                  {weatherInsights && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-8 rounded-3xl bg-emerald-50 border border-emerald-100 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Sparkles size={80} className="text-emerald-600" />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6 text-emerald-700">
                          <div className="bg-emerald-100 p-2 rounded-lg">
                            <CheckCircle2 size={24} />
                          </div>
                          <h4 className="text-lg font-bold" data-i18n="aiWeatherAnalysis">{t('aiWeatherAnalysis')}</h4>
                        </div>
                        <div className="prose prose-stone prose-sm max-w-none text-emerald-900/80 leading-relaxed">
                          <Markdown>{weatherInsights.aiAnalysis}</Markdown>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {weatherInsights?.forecast && (
                    <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-6">{t('fiveDayForecast')}</h4>
                      <div className="grid grid-cols-5 gap-4">
                        {weatherInsights.forecast.map((day: any, i: number) => (
                          <div key={i} className="text-center">
                            <p className="text-xs font-bold text-stone-500 mb-2">{day.day}</p>
                            <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                              <Cloud size={20} className="text-stone-400" />
                            </div>
                            <p className="text-sm font-black text-stone-900">{day.temp}°</p>
                            <p className="text-[10px] font-medium text-stone-400 truncate">{day.condition}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Forecast & Alerts */}
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="font-bold text-stone-800 text-lg" data-i18n="fiveDayForecast">{t('fiveDayForecast')}</h3>
                      <Calendar className="text-stone-400 w-5 h-5" />
                    </div>
                    <div className="space-y-6">
                      {[
                        { day: 'mon', icon: Sun, color: 'text-amber-500', high: 34, low: 26 },
                        { day: 'tue', icon: CloudSun, color: 'text-stone-400', high: 32, low: 25 },
                        { day: 'wed', icon: CloudSun, color: 'text-stone-400', high: 31, low: 24 },
                        { day: 'thu', icon: Sun, color: 'text-amber-500', high: 33, low: 26 },
                        { day: 'fri', icon: CloudSun, color: 'text-stone-400', high: 30, low: 22 },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 hover:bg-stone-50 rounded-2xl transition-all group">
                          <div className="flex items-center gap-4">
                            <p className="w-10 font-bold text-stone-500 uppercase tracking-wider text-xs">{t(item.day as any)}</p>
                            <div className={`p-2 rounded-xl bg-stone-50 group-hover:bg-white transition-all ${item.color}`}>
                              <item.icon size={20} />
                            </div>
                          </div>
                          <div className="flex gap-4 text-sm font-bold">
                            <span className="text-stone-800">{item.high}°</span>
                            <span className="text-stone-300">{item.low}°</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3 text-stone-800">
                        <div className="bg-amber-50 p-2 rounded-lg">
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                        </div>
                        <h3 className="font-bold" data-i18n="weatherAlerts">{t('weatherAlerts')}</h3>
                      </div>
                    </div>
                    <div className="p-6 rounded-2xl bg-stone-50 border border-stone-100 text-center">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <CheckCircle2 className="text-emerald-500 w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-stone-500 leading-relaxed" data-i18n="noAlerts">{t('noAlerts')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'Profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Profile Hero Header */}
              <div className="relative rounded-3xl overflow-hidden bg-white border border-stone-200 shadow-sm">
                <div className="h-32 md:h-48 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-300 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>
                  </div>
                  <div className="absolute top-4 right-4 flex gap-2">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white rounded-lg text-[10px] font-black uppercase tracking-wider border border-white/20">
                      {t('verifiedFarmer')}
                    </span>
                  </div>
                </div>
                <div className="px-6 md:px-10 pb-8 -mt-12 md:-mt-16 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                  <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-white p-1.5 shadow-2xl">
                      <div className="w-full h-full rounded-[1.25rem] bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-3xl md:text-4xl border-4 border-white">
                        {profile.name[0]}
                      </div>
                    </div>
                    <div className="text-center md:text-left pb-2">
                      <h2 className="text-2xl md:text-3xl font-bold text-stone-900">{profile.name}</h2>
                      <div className="flex items-center justify-center md:justify-start gap-2 text-stone-500 font-medium mt-1">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm md:text-base">{user?.email}</span>
                      </div>
                    </div>
                  </div>
                  {!isEditingProfile && (
                    <button 
                      onClick={() => {
                        setTempProfile({...profile});
                        setIsEditingProfile(true);
                      }}
                      className="flex items-center justify-center gap-2 px-8 py-4 bg-stone-900 text-white rounded-2xl text-sm font-bold hover:bg-stone-800 transition-all shadow-xl shadow-stone-200 group"
                    >
                      <Edit3 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                      {t('editProfile')}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sidebar Info */}
                <div className="space-y-8">
                  {/* Quick Stats Card */}
                  <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8">
                    <div className="flex items-center justify-between mb-8">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400">{t('quickStats')}</h4>
                      <Activity className="w-4 h-4 text-stone-300" />
                    </div>
                    <div className="space-y-6">
                      {[
                        { icon: MapPin, label: t('location'), value: `${profile.village}, ${profile.district}`, color: 'text-blue-500', bg: 'bg-blue-50' },
                        { icon: Maximize, label: t('landSize'), value: `${profile.landSize} ${t('acres')}`, color: 'text-orange-500', bg: 'bg-orange-50' },
                        { icon: Phone, label: t('mobileNumber'), value: profile.mobile, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                      ].map((stat, idx) => (
                        <div key={idx} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 ${stat.bg} ${stat.color} rounded-xl transition-transform group-hover:scale-110`}>
                              <stat.icon className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold text-stone-600">{stat.label}</span>
                          </div>
                          <span className="text-sm font-black text-stone-900">{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Preferences Card */}
                  <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8">
                    <div className="flex items-center justify-between mb-8">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400">{t('preferences')}</h4>
                      <Bell className="w-4 h-4 text-stone-300" />
                    </div>
                    <div className="space-y-6">
                      {[
                        { id: 'email', label: t('emailNotifications'), state: emailNotifications, setter: setEmailNotifications, icon: Mail },
                        { id: 'sms', label: t('smsNotifications'), state: smsNotifications, setter: setSmsNotifications, icon: MessageSquare },
                        { id: 'push', label: t('pushNotifications'), state: pushNotifications, setter: setPushNotifications, icon: Bell },
                      ].map((item) => (
                        <div key={item.id} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${item.state ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-50 text-stone-400'}`}>
                              <item.icon className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold text-stone-700 group-hover:text-emerald-600 transition-colors">{item.label}</span>
                          </div>
                          <button 
                            onClick={() => item.setter(!item.state)}
                            className={`w-11 h-6 rounded-full transition-all relative ${item.state ? 'bg-emerald-500' : 'bg-stone-200'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${item.state ? 'left-6' : 'left-1'}`} />
                          </button>
                        </div>
                      ))}
                      
                      <div className="pt-6 border-t border-stone-100">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-stone-50 text-stone-400 rounded-lg">
                            <Globe className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-bold text-stone-700">{t('language')}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {(['en', 'hi', 'mr'] as Language[]).map((l) => (
                            <button
                              key={l}
                              onClick={() => handleLangChange(l)}
                              className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                                lang === l 
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100' 
                                  : 'bg-white text-stone-500 border-stone-200 hover:border-emerald-200'
                              }`}
                            >
                              {l === 'en' ? 'English' : l === 'hi' ? 'हिंदी' : 'मराठी'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-8">
                  {isEditingProfile ? (
                    <form onSubmit={handleUpdateProfile} className="space-y-8">
                      {/* Personal Details Form */}
                      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8 md:p-10">
                        <div className="flex flex-col md:flex-row items-center gap-8 mb-10 pb-10 border-b border-stone-100">
                          <div className="relative group">
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-3xl md:text-4xl border-4 border-white shadow-xl">
                              {tempProfile.name[0]}
                            </div>
                            <button type="button" className="absolute -bottom-2 -right-2 p-2.5 bg-stone-900 text-white rounded-xl shadow-lg hover:bg-emerald-600 transition-all">
                              <Camera className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="text-center md:text-left">
                            <h4 className="font-bold text-stone-800 mb-1">{t('profilePicture')}</h4>
                            <p className="text-xs text-stone-400 font-medium mb-4">{t('profilePictureDesc') || 'Update your profile photo to be recognized by the community'}</p>
                            <div className="flex items-center justify-center md:justify-start gap-3">
                              <button type="button" className="px-5 py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-all">{t('uploadNew') || 'Upload New'}</button>
                              <button type="button" className="px-5 py-2.5 bg-white border border-stone-200 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-50 transition-all">{t('remove') || 'Remove'}</button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mb-8">
                          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                            <UserIcon className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-stone-800">{t('personalInfo')}</h3>
                            <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">{t('updatePersonalDetails')}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">{t('farmerName')}</label>
                            <input 
                              type="text" 
                              value={tempProfile.name}
                              onChange={(e) => setTempProfile({...tempProfile, name: e.target.value})}
                              className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-6 py-4 text-sm font-bold text-stone-800 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all border-transparent focus:border-emerald-500/20" 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">{t('age')}</label>
                            <input 
                              type="number" 
                              value={tempProfile.age}
                              onChange={(e) => setTempProfile({...tempProfile, age: e.target.value})}
                              className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-6 py-4 text-sm font-bold text-stone-800 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all border-transparent focus:border-emerald-500/20" 
                            />
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">{t('mobileNumber')}</label>
                            <input 
                              type="tel" 
                              value={tempProfile.mobile}
                              onChange={(e) => setTempProfile({...tempProfile, mobile: e.target.value})}
                              className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-6 py-4 text-sm font-bold text-stone-800 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all border-transparent focus:border-emerald-500/20" 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Location Details Form */}
                      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8 md:p-10">
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                              <MapPin className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-stone-800">{t('locationDetails')}</h3>
                              <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">{t('updateLocationDetails')}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleDetectLocation}
                            disabled={isDetectingLocation}
                            className="px-5 py-2.5 bg-stone-50 border border-stone-100 rounded-xl text-xs font-bold text-emerald-600 flex items-center gap-2 hover:bg-emerald-50 transition-all shadow-sm"
                          >
                            <Navigation className={`w-3.5 h-3.5 ${isDetectingLocation ? 'animate-spin' : ''}`} />
                            {isDetectingLocation ? t('detecting') : t('detectLocation')}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">{t('village')}</label>
                            <input 
                              type="text" 
                              value={tempProfile.village}
                              onChange={(e) => setTempProfile({...tempProfile, village: e.target.value})}
                              className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-6 py-4 text-sm font-bold text-stone-800 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all border-transparent focus:border-emerald-500/20" 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">{t('district')}</label>
                            <input 
                              type="text" 
                              value={tempProfile.district}
                              onChange={(e) => setTempProfile({...tempProfile, district: e.target.value})}
                              className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-6 py-4 text-sm font-bold text-stone-800 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all border-transparent focus:border-emerald-500/20" 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">{t('state')}</label>
                            <input 
                              type="text" 
                              value={tempProfile.state}
                              onChange={(e) => setTempProfile({...tempProfile, state: e.target.value})}
                              className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-6 py-4 text-sm font-bold text-stone-800 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all border-transparent focus:border-emerald-500/20" 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Farming Details Form */}
                      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8 md:p-10">
                        <div className="flex items-center gap-4 mb-8">
                          <div className="p-3 bg-orange-50 rounded-2xl text-orange-600">
                            <Sprout className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-stone-800">{t('farmingDetails')}</h3>
                            <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">{t('updateFarmingDetails')}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">{t('landSize')}</label>
                            <input 
                              type="number" 
                              value={tempProfile.landSize}
                              onChange={(e) => setTempProfile({...tempProfile, landSize: e.target.value})}
                              className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-6 py-4 text-sm font-bold text-stone-800 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all border-transparent focus:border-emerald-500/20" 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">{t('primaryCrop')}</label>
                            <input 
                              type="text" 
                              value={tempProfile.primaryCrop}
                              onChange={(e) => setTempProfile({...tempProfile, primaryCrop: e.target.value})}
                              className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-6 py-4 text-sm font-bold text-stone-800 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all border-transparent focus:border-emerald-500/20" 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Security Form */}
                      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8 md:p-10">
                        <div className="flex items-center gap-4 mb-8">
                          <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
                            <Lock className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-stone-800">{t('changePassword')}</h3>
                            <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">{t('manageSecuritySettings')}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">{t('newPassword')}</label>
                            <input 
                              type="password" 
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-6 py-4 text-sm font-bold text-stone-800 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all border-transparent focus:border-emerald-500/20" 
                              placeholder="••••••••"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">{t('confirmPassword')}</label>
                            <input 
                              type="password" 
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full bg-stone-50 border border-stone-100 rounded-2xl px-6 py-4 text-sm font-bold text-stone-800 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all border-transparent focus:border-emerald-500/20" 
                              placeholder="••••••••"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-4 pt-4">
                        <button 
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="px-8 py-4 bg-white border border-stone-200 rounded-2xl text-sm font-bold text-stone-600 hover:bg-stone-50 transition-all"
                        >
                          {t('cancel')}
                        </button>
                        <button 
                          type="submit"
                          disabled={isUpdatingProfile}
                          className="px-12 py-4 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50"
                        >
                          {isUpdatingProfile ? t('processing') : t('saveChanges')}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-8">
                      {/* Account Overview Card */}
                      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
                        <div className="p-8 md:p-10 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-white rounded-2xl text-emerald-600 shadow-sm">
                              <Layout className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-stone-800">{t('accountOverview')}</h3>
                          </div>
                          <div className="flex items-center gap-2 text-stone-400 text-[10px] font-black uppercase tracking-widest">
                            <Calendar className="w-4 h-4" />
                            {t('joinedDate')}: 2024
                          </div>
                        </div>
                        
                        <div className="p-8 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-12">
                          <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400">{t('personalDetails')}</h4>
                            <div className="space-y-4">
                              {[
                                { label: t('farmerName'), value: profile.name },
                                { label: t('age'), value: `${profile.age} ${t('years')}` },
                                { label: t('mobileNumber'), value: profile.mobile },
                              ].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between py-3 border-b border-stone-50 last:border-0">
                                  <span className="text-sm font-bold text-stone-500">{item.label}</span>
                                  <span className="text-sm font-black text-stone-800">{item.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400">{t('farmingOverview')}</h4>
                            <div className="space-y-4">
                              {[
                                { label: t('landSize'), value: `${profile.landSize} ${t('acres')}` },
                                { label: t('primaryCrop'), value: profile.primaryCrop },
                                { label: t('location'), value: `${profile.village}, ${profile.state}` },
                              ].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between py-3 border-b border-stone-50 last:border-0">
                                  <span className="text-sm font-bold text-stone-500">{item.label}</span>
                                  <span className="text-sm font-black text-stone-800">{item.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Security Card */}
                      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8 md:p-10">
                        <div className="flex items-center gap-4 mb-10">
                          <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
                            <Shield className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-stone-800">{t('security')}</h3>
                            <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">{t('manageSecuritySettings')}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {[
                            { icon: Lock, title: t('changePassword'), desc: `${t('lastChanged')} 3 ${t('monthsAgo')}`, status: null, action: () => { setTempProfile({...profile}); setIsEditingProfile(true); } },
                            { icon: Fingerprint, title: t('twoFactorAuth'), desc: t('enabled'), status: 'active', action: null },
                          ].map((item, idx) => (
                            <div 
                              key={idx} 
                              onClick={item.action || undefined}
                              className={`flex items-center justify-between p-6 bg-stone-50 rounded-2xl border border-stone-100 group hover:border-emerald-200 hover:bg-white transition-all shadow-sm hover:shadow-md ${item.action ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-xl text-stone-400 group-hover:text-emerald-500 transition-colors shadow-sm">
                                  <item.icon className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-stone-800">{item.title}</p>
                                  <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${item.status === 'active' ? 'text-emerald-500' : 'text-stone-400'}`}>{item.desc}</p>
                                </div>
                              </div>
                              {item.action && <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-emerald-500 transition-all" />}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Logout Section */}
                      <div className="bg-rose-50 rounded-3xl p-8 border border-rose-100 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4 text-center md:text-left">
                          <div className="p-4 bg-white rounded-2xl text-rose-600 shadow-sm border border-rose-100">
                            <LogOut className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-rose-900">{t('logout')}</h4>
                            <p className="text-xs text-rose-600/60 font-bold uppercase tracking-widest mt-1">{t('logoutDesc')}</p>
                          </div>
                        </div>
                        <button 
                          onClick={handleLogout}
                          className="w-full md:w-auto px-10 py-4 bg-rose-600 text-white rounded-2xl text-sm font-bold hover:bg-rose-700 transition-all shadow-xl shadow-rose-500/20 active:scale-95"
                        >
                          {t('logout')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>

    {/* Mobile Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 px-2 py-3 z-50 flex justify-around items-center">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as Tab)}
            className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all ${
              activeTab === item.id ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'
            }`}
          >
            <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Toast Notification */}
      <AnimatePresence>
        {showProfileToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10"
          >
            <CheckCircle2 className="text-emerald-400 w-5 h-5" />
            <span className="text-sm font-bold">{t('settingsUpdated')}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
