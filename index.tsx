import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, Search, Plus, Bell, User, Home, MonitorPlay, 
  PlaySquare, Clock, ThumbsUp, ThumbsDown, Share2, 
  MoreHorizontal, Upload, X, Play, Pause, Maximize,
  MessageSquare, Flame, TrendingUp
} from 'lucide-react';

// --- Firebase Setup (Multiplayer Backend) ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, addDoc, updateDoc } from 'firebase/firestore';

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const app = firebaseConfig ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'tintub-default';

// --- Utility Functions ---
const generateId = () => Math.random().toString(36).substr(2, 9);

const formatViews = (num) => {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const getTimeAgo = (timestamp) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return "Just now";
};

// Extractor to find YouTube IDs from any pasted YouTube link (Updated to catch Shorts & Live)
const extractYouTubeID = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// --- Isolated, Re-render Immune Video Players ---
// These forcefields prevent the game from resetting the video when view counts update!
const MemoizedVideoPlayer = React.memo(({ videoUrl, thumbnail }) => {
  return (
    <video 
      key={videoUrl}
      src={videoUrl}
      controls 
      playsInline
      preload="metadata"
      className="w-full h-full object-contain bg-black"
      poster={thumbnail}
    />
  );
});

const MemoizedYouTubePlayer = React.memo(({ ytId }) => {
  return (
    <iframe 
      width="100%" 
      height="100%" 
      src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&modestbranding=1&rel=0`} 
      title="TINTUB Video Player" 
      frameBorder="0" 
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
      allowFullScreen
      className="w-full h-full bg-black"
    ></iframe>
  );
});

// --- Seed Data (Cloudinary & Video.js CDNs - 100% Unblockable, No Throttling!) ---
const seedData = [
  {
    title: 'Ocean Explorer',
    channel: 'Deep Blue', uploaderId: 'seed1',
    realViews: 165000000, likes: 3200000, createdAt: Date.now() - 5000000000,
    duration: '0:46',
    thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=640&q=80',
    videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ocean', category: 'Travel',
    description: 'A beautiful journey through the ocean.',
    comments: [{ user: 'BeachBum', text: 'This aesthetic is everything.' }]
  },
  {
    title: 'Blue Moon Surf Trailer',
    channel: 'Wanderlust', uploaderId: 'seed2',
    realViews: 8900000, likes: 450000, createdAt: Date.now() - 10000000000,
    duration: '0:45',
    thumbnail: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=640&q=80',
    videoUrl: 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-576p.mp4',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Travel', category: 'Film',
    description: 'Incredible surfing footage from around the world.',
    comments: [{ user: 'SurferDude', text: 'I need to go there right now.' }]
  },
  {
    title: 'Cute Dog Playing in the Grass',
    channel: 'Animal Planet', uploaderId: 'seed3',
    realViews: 245000000, likes: 4500000, createdAt: Date.now() - 2000000000,
    duration: '0:12',
    thumbnail: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=640&q=80',
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/w_640/q_auto/dog.mp4',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dog', category: 'Vlog',
    description: 'Just a happy dog enjoying a sunny day.',
    comments: [{ user: 'DogLover', text: 'Too cute!' }]
  },
  {
    title: 'Wild Elephants Safari',
    channel: 'NatureLaughs', uploaderId: 'seed4',
    realViews: 85000000, likes: 2100000, createdAt: Date.now() - 500000000,
    duration: '0:18',
    thumbnail: 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&w=640&q=80',
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/w_640/q_auto/elephants.mp4',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nature', category: 'Travel',
    description: 'Encountering wild elephants during our safari trip.',
    comments: [{ user: 'HikerBro', text: 'Nature is amazing.' }]
  },
  {
    title: 'Diving with Sea Turtles',
    channel: 'ScubaPro', uploaderId: 'seed5',
    realViews: 21000000, likes: 890000, createdAt: Date.now() - 800000000,
    duration: '0:15',
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=640&q=80',
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/w_640/q_auto/sea_turtle.mp4',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Turtle', category: 'Vlog',
    description: 'Swimming alongside these majestic creatures.',
    comments: [{ user: 'DiverDan', text: 'A dream come true.' }]
  },
  {
    title: 'Horses Running in the Snow',
    channel: 'Wild Kingdom', uploaderId: 'seed6',
    realViews: 34000000, likes: 340000, createdAt: Date.now() - 100000000,
    duration: '0:14',
    thumbnail: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=640&q=80',
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/w_640/q_auto/snow_horses.mp4',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Horse', category: 'Film',
    description: 'Beautiful wild horses running through a winter wonderland.',
    comments: [{ user: 'WinterFan', text: 'So majestic.' }]
  }
];

// --- Additional Data for Infinite Scroll ---
const videoTemplates = [
  { baseTitle: "Ocean Explorer HD", videoUrl: "https://vjs.zencdn.net/v/oceans.mp4", category: "Travel" },
  { baseTitle: "Blue Moon Surf Cinematic", videoUrl: "https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-576p.mp4", category: "Film" },
  { baseTitle: "Cute Dog Compilation", videoUrl: "https://res.cloudinary.com/demo/video/upload/w_640/q_auto/dog.mp4", category: "Vlog" },
  { baseTitle: "Elephant Safari Vlog", videoUrl: "https://res.cloudinary.com/demo/video/upload/w_640/q_auto/elephants.mp4", category: "Travel" },
  { baseTitle: "Sea Turtle Dive", videoUrl: "https://res.cloudinary.com/demo/video/upload/w_640/q_auto/sea_turtle.mp4", category: "Travel" },
  { baseTitle: "Wild Snow Horses", videoUrl: "https://res.cloudinary.com/demo/video/upload/w_640/q_auto/snow_horses.mp4", category: "Film" }
];

const randomChannels = ["TechGuru", "Wanderlust", "GamerZ", "DailyVlog", "CodeNinja", "ChefLife", "BuildIt", "ScienceRules", "FitPro", "AutoFanatic", "MysterySeeker", "ReviewBros", "PixelPerfect", "SoundWave"];

export default function App() {
  // --- Game/Multiplayer State ---
  const [user, setUser] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [channelProfile, setChannelProfile] = useState(() => {
    const saved = localStorage.getItem('tintubProfile');
    return saved ? JSON.parse(saved) : null;
  });
  const [isGoogleSignInOpen, setIsGoogleSignInOpen] = useState(() => !localStorage.getItem('tintubProfile'));
  
  // Auth Mode State
  const [authMode, setAuthMode] = useState(() => {
    const existingUsers = JSON.parse(localStorage.getItem('tintubUsers') || '{}');
    return Object.keys(existingUsers).length > 0 ? 'signin' : 'signup';
  });

  const [videos, setVideos] = useState([]);
  const [localExpandedVideos, setLocalExpandedVideos] = useState([]);
  
  // --- UI State ---
  const [currentView, setCurrentView] = useState('home');
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [subscribedChannels, setSubscribedChannels] = useState({});
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // New States for Sidebar Features
  const [watchHistory, setWatchHistory] = useState(() => JSON.parse(localStorage.getItem('tintub-history') || '[]'));
  const [likedVideoIds, setLikedVideoIds] = useState(() => JSON.parse(localStorage.getItem('tintub-likes') || '[]'));
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState('');

  // --- Auth & Data Fetching ---
  useEffect(() => {
    if (!auth) {
      setAuthLoaded(true);
      return;
    }
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error("Auth error:", e);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoaded(true);
      // Load saved profile if exists
      const saved = localStorage.getItem('tintubProfile');
      if (saved) {
        setChannelProfile(JSON.parse(saved));
        setIsGoogleSignInOpen(false);
      } else if (u && !u.isAnonymous && u.email) {
        // Auto-login with real connected platform Google account if available!
        const name = u.displayName || u.email.split('@')[0];
        const profile = { 
          name: name, 
          email: u.email,
          avatar: u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}` 
        };
        setChannelProfile(profile);
        localStorage.setItem('tintubProfile', JSON.stringify(profile));
        setIsGoogleSignInOpen(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    // Bumping to v8 to give you a 100% fresh, clean database
    const videosRef = collection(db, 'artifacts', appId, 'public', 'data', 'tintub_videos_v8');
    
    const unsubscribe = onSnapshot(videosRef, async (snapshot) => {
      const fetchedVideos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Auto-seed database if completely empty (multiplayer initialization)
      if (fetchedVideos.length === 0) {
        try {
          for (const video of seedData) {
            await addDoc(videosRef, video);
          }
        } catch (e) { console.error("Seeding error", e); }
      } else {
        // Sort by newest first
        fetchedVideos.sort((a, b) => b.createdAt - a.createdAt);
        setVideos(fetchedVideos);
      }
    }, (err) => console.error(err));
    
    return () => unsubscribe();
  }, [user]);

  // --- Derived Player Stats ---
  // Adding the .sort() here guarantees the newest published video is ALWAYS top-left!
  const allVideos = [...videos, ...localExpandedVideos].sort((a, b) => b.createdAt - a.createdAt);
  const myVideos = allVideos.filter(v => v.uploaderId === user?.uid);
  const totalMyViews = myVideos.reduce((sum, v) => sum + v.realViews, 0);
  const mySubscribers = Math.floor(totalMyViews * 0.05);

  // --- Actions ---
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleSignOut = () => {
    localStorage.removeItem('tintubProfile');
    setChannelProfile(null);
    setIsGoogleSignInOpen(true);
    showToast('Signed out successfully.');
  };

  const handleDeleteAccount = () => {
    const usersDb = JSON.parse(localStorage.getItem('tintubUsers') || '{}');
    if (channelProfile && channelProfile.email) {
      delete usersDb[channelProfile.email];
      localStorage.setItem('tintubUsers', JSON.stringify(usersDb));
    }
    localStorage.removeItem('tintubProfile');
    setChannelProfile(null);
    setIsGoogleSignInOpen(true);
    setAuthMode('signup');
    setIsDeleteModalOpen(false);
    showToast('Account permanently deleted. Email is now free to use again.');
  };

  const handleLoadMore = () => {
    const newVideos = Array.from({ length: 16 }).map(() => {
      const vidId = generateId();
      const template = videoTemplates[Math.floor(Math.random() * videoTemplates.length)];
      const channel = randomChannels[Math.floor(Math.random() * randomChannels.length)];
      const suffixes = ['(HD)', '4K', 'Reaction', 'Review', 'Part 2', 'Must Watch!'];
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      
      return {
        id: 'local_' + vidId,
        title: `${template.baseTitle} ${suffix}`,
        channel: channel,
        realViews: Math.floor(Math.random() * 2000000),
        likes: Math.floor(Math.random() * 50000),
        createdAt: Date.now() - Math.floor(Math.random() * 10000000000),
        uploaderId: 'auto_generated',
        isAutoGenerated: true,
        duration: `${Math.floor(Math.random() * 15) + 1}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
        thumbnail: `https://picsum.photos/seed/${vidId}/640/360`,
        videoUrl: template.videoUrl,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${channel}`,
        category: template.category,
        description: `Thanks for watching! Make sure to like and subscribe for more content from ${channel}.`,
        comments: []
      };
    });
    setLocalExpandedVideos(prev => [...prev, ...newVideos]);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadFile(file);
      setUploadPreview(URL.createObjectURL(file));
    }
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    if (!email || !password) return;
    
    const usersDb = JSON.parse(localStorage.getItem('tintubUsers') || '{}');

    if (authMode === 'signup') {
      if (usersDb[email]) {
        showToast('Email is already taken! You must delete the existing account to use it again.');
        return;
      }
      // First time signing in with this email -> Create "account"
      usersDb[email] = password;
      localStorage.setItem('tintubUsers', JSON.stringify(usersDb));
      showToast(`Account created for ${email}!`);
    } else {
      // Sign in mode
      if (!usersDb[email]) {
        showToast('Account not found. Please sign up first.');
        return;
      }
      if (usersDb[email] !== password) {
        showToast('Incorrect password!');
        return;
      }
      showToast(`Signed in successfully!`);
    }
    
    // Create a channel name from the email prefix (e.g. john.doe@gmail.com -> John Doe)
    const prefix = email.split('@')[0];
    const name = prefix.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).trim() || 'User';
    
    const profile = { name, email, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}` };
    setChannelProfile(profile);
    localStorage.setItem('tintubProfile', JSON.stringify(profile));
    setIsGoogleSignInOpen(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!user || !db) return;
    
    const title = e.target.title.value;
    const description = e.target.description.value;
    const category = e.target.category.value;
    const pastedLink = e.target.youtubeLink.value;
    if (!title) return;

    // Default video if none provided
    let finalUrl = 'https://vjs.zencdn.net/v/oceans.mp4';
    let isLocal = false;

    if (uploadFile) {
        finalUrl = uploadPreview;
        isLocal = true;
    } else if (pastedLink) {
        finalUrl = pastedLink;
    }

    const newVideo = {
      title,
      channel: channelProfile.name,
      uploaderId: user.uid,
      realViews: 0,
      likes: 0,
      createdAt: Date.now(),
      duration: 'LIVE',
      thumbnail: uploadFile ? uploadPreview : `https://picsum.photos/seed/${title}/640/360`,
      videoUrl: finalUrl,
      isLocal: isLocal,
      avatar: channelProfile.avatar,
      category: category || 'Vlog',
      description: description || 'No description provided.',
      comments: []
    };

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tintub_videos_v8'), newVideo);
      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadPreview('');
      showToast('Video published globally!');
    } catch (err) {
      console.error(err);
      showToast('Error uploading video.');
    }
  };

  const handleWatch = async (video) => {
    setActiveVideoId(video.id);
    setCurrentView('watch');
    setIsDescExpanded(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Update watch history
    setWatchHistory(prev => {
      const newHist = [video.id, ...prev.filter(id => id !== video.id)];
      localStorage.setItem('tintub-history', JSON.stringify(newHist));
      return newHist;
    });

    // Add a real view to the database
    if (video.isAutoGenerated) {
      setLocalExpandedVideos(prev => prev.map(v => v.id === video.id ? { ...v, realViews: v.realViews + 1 } : v));
    } else if (db) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'tintub_videos_v8', video.id);
        await updateDoc(docRef, { realViews: video.realViews + 1 });
      } catch (e) { console.error(e); }
    }
  };

  const handleLike = async (video) => {
    if (!db) return;
    const isLiked = likedVideoIds.includes(video.id);
    
    if (video.isAutoGenerated) {
      setLocalExpandedVideos(prev => prev.map(v => v.id === video.id ? { ...v, likes: isLiked ? v.likes - 1 : v.likes + 1 } : v));
    } else if (db) {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'tintub_videos_v8', video.id);
      await updateDoc(docRef, { likes: isLiked ? video.likes - 1 : video.likes + 1 });
    }
    
    // Update local like state
    setLikedVideoIds(prev => {
      const next = isLiked ? prev.filter(id => id !== video.id) : [...prev, video.id];
      localStorage.setItem('tintub-likes', JSON.stringify(next));
      return next;
    });
    showToast(isLiked ? 'Removed from Liked videos' : 'Added to Liked videos');
  };

  const handleShare = async (video) => {
    // Game mechanic: Sharing gives a massive permanent view boost!
    if (video.isAutoGenerated) {
      setLocalExpandedVideos(prev => prev.map(v => v.id === video.id ? { ...v, realViews: v.realViews + 500 } : v));
    } else if (db) {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'tintub_videos_v8', video.id);
      await updateDoc(docRef, { realViews: video.realViews + 500 });
    }
    showToast('Link copied! (+500 view boost applied!)');
  };

  const handleAddComment = async (e, video) => {
    e.preventDefault();
    if (!db) return;
    const text = e.target.comment.value;
    if (!text) return;
    
    const newComment = { user: channelProfile.name, text };
    
    if (video.isAutoGenerated) {
      setLocalExpandedVideos(prev => prev.map(v => v.id === video.id ? { ...v, comments: [newComment, ...v.comments] } : v));
    } else if (db) {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'tintub_videos_v8', video.id);
      await updateDoc(docRef, {
        comments: [newComment, ...video.comments]
      });
    }
    e.target.reset();
  };

  const handleSubscribe = (channel) => {
    setSubscribedChannels(prev => ({ ...prev, [channel]: !prev[channel] }));
    showToast(subscribedChannels[channel] ? 'Unsubscribed' : 'Subscribed');
  };

  // --- Rendering ---
  if (!authLoaded) return <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">Loading TINTUB Server...</div>;

  // Render the "Sign in with Google" simulation if they haven't set up a channel
  if (isGoogleSignInOpen) {
    return (
      <div className="min-h-screen bg-[#f0f4f9] flex flex-col items-center justify-center p-4 text-black font-sans">
        <div className="bg-white rounded-[24px] shadow-sm w-full max-w-[450px] p-10">
          <div className="flex justify-center mb-4">
            <svg className="w-12 h-12" viewBox="0 0 48 48">
              <title>Google Logo</title>
              <clipPath id="g">
                <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
              </clipPath>
              <g className="colors" clipPath="url(#g)">
                <path fill="#FBBC05" d="M0 37V11l17 13z"/>
                <path fill="#EA4335" d="M0 11l17 13 7-6.1L48 14V0H0z"/>
                <path fill="#34A853" d="M0 37l30-23 7.9 1L48 0v48H0z"/>
                <path fill="#4285F4" d="M48 48L17 24l-4-3 35-10z"/>
              </g>
            </svg>
          </div>
          <h1 className="text-[24px] font-normal text-center mb-2">
            {authMode === 'signup' ? 'Create Account' : 'Sign in'}
          </h1>
          <p className="text-center text-[16px] text-gray-800 mb-8">
            {authMode === 'signup' ? 'Sign up to join TINTUB' : 'Use your TINTUB Account'}
          </p>
          
          <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
            <div>
              <input 
                type="email" 
                name="email"
                placeholder="Email or phone" 
                required
                className="w-full border border-gray-300 rounded-[4px] px-4 py-3.5 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 transition-colors text-[16px]"
              />
            </div>
            <div>
              <input 
                type="password" 
                name="password"
                placeholder={authMode === 'signup' ? "Create a password" : "Enter your password"}
                required
                className="w-full border border-gray-300 rounded-[4px] px-4 py-3.5 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600 transition-colors text-[16px]"
              />
            </div>
            {authMode === 'signin' && (
              <div className="text-[#0b57d0] text-[14px] font-medium cursor-pointer hover:underline mb-2">
                Forgot email or password?
              </div>
            )}
            <p className="text-sm text-gray-600 mb-8 mt-2">
              Not your computer? Use Guest mode to sign in privately. <span className="text-[#0b57d0] cursor-pointer hover:underline">Learn more</span>
            </p>
            <div className="flex justify-between items-center">
              <button 
                type="button" 
                onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
                className="text-[#0b57d0] font-medium text-[14px] hover:bg-[#f0f4f9] px-3 py-2 rounded-full transition-colors"
              >
                {authMode === 'signup' ? 'Sign in instead' : 'Create account'}
              </button>
              <button type="submit" className="bg-[#0b57d0] text-white px-6 py-2.5 rounded-full hover:bg-[#0842a0] font-medium text-[14px] transition-colors">
                {authMode === 'signup' ? 'Sign Up' : 'Next'}
              </button>
            </div>
          </form>
        </div>
        <div className="mt-4 text-xs text-gray-500 max-w-[450px] text-center">
          Note: This is a secure game simulation. Passwords are saved locally on your device.
        </div>
      </div>
    );
  }

  const activeVideo = allVideos.find(v => v.id === activeVideoId);
  const categories = ['All', 'Gaming', 'Film', 'Travel', 'Coding', 'DIY', 'Vlog'];
  
  const filteredVideos = allVideos
    .filter(v => categoryFilter === 'All' || v.category === categoryFilter || (categoryFilter === 'Vlog' && v.uploaderId === user?.uid))
    .filter(v => v.title.toLowerCase().includes(searchQuery.toLowerCase()));

  // Extract YouTube ID safely
  const ytId = activeVideo ? extractYouTubeID(activeVideo.videoUrl) : null;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f1f1f1] font-sans selection:bg-gray-700 selection:text-white flex flex-col">
      
      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full h-14 bg-[#0f0f0f] flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-[#272727] rounded-full transition-colors hidden md:block">
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => setCurrentView('home')}>
            <div className="bg-red-600 text-white rounded-lg p-1 flex items-center justify-center">
              <PlaySquare size={20} fill="white" />
            </div>
            <span className="text-xl font-bold tracking-tighter">TINTUB</span>
          </div>
        </div>

        <div className="flex-1 max-w-2xl px-4 flex items-center">
          <div className="flex w-full">
            <div className="flex-1 flex items-center bg-[#121212] border border-[#303030] rounded-l-full px-4 focus-within:border-blue-500 ml-4 md:ml-12">
              <Search size={20} className="text-gray-400 mr-2 hidden md:block" />
              <input 
                type="text" 
                placeholder="Search" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-none text-[#f1f1f1] h-10"
              />
            </div>
            <button className="bg-[#222222] border border-l-0 border-[#303030] rounded-r-full px-5 hover:bg-[#303030] transition-colors">
              <Search size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => setIsUploadOpen(true)}
            className="hidden sm:flex items-center gap-2 bg-[#272727] hover:bg-[#3f3f3f] px-3 py-2 rounded-full transition-colors text-sm font-medium"
          >
            <Plus size={20} /> Create
          </button>
          <button className="p-2 hover:bg-[#272727] rounded-full transition-colors hidden sm:block">
            <Bell size={24} />
          </button>
          {channelProfile && (
            <div className="relative">
              <img 
                src={channelProfile.avatar} 
                alt="Profile" 
                className="w-8 h-8 rounded-full border border-gray-600 cursor-pointer" 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              />
              
              {/* Click-to-open menu instead of glitchy hover */}
              {isProfileMenuOpen && (
                <>
                  {/* Invisible overlay that closes the menu if you click outside of it */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsProfileMenuOpen(false)}
                  ></div>
                  
                  <div className="absolute right-0 mt-2 w-48 bg-[#212121] rounded-xl shadow-lg border border-[#303030] overflow-hidden z-50">
                    <div className="p-4 border-b border-[#303030]">
                      <p className="font-semibold text-sm text-white truncate">{channelProfile.name}</p>
                      <p className="text-xs text-gray-400 truncate">{channelProfile.email}</p>
                    </div>
                    <button 
                      onClick={() => {
                        handleSignOut();
                        setIsProfileMenuOpen(false);
                      }} 
                      className="w-full text-left px-4 py-3 text-sm hover:bg-[#3f3f3f] transition-colors text-white font-medium"
                    >
                      Sign out
                    </button>
                    <button 
                      onClick={() => {
                        setIsDeleteModalOpen(true);
                        setIsProfileMenuOpen(false);
                      }} 
                      className="w-full text-left px-4 py-3 text-sm hover:bg-[#3f3f3f] transition-colors text-red-500 font-medium border-t border-[#303030]"
                    >
                      Delete Account
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* --- MAIN LAYOUT --- */}
      <div className="flex flex-1 pt-14 h-full">
        
        {/* --- SIDEBAR --- */}
        <aside className={`fixed left-0 top-14 bottom-0 bg-[#0f0f0f] w-60 overflow-y-auto z-40 transition-transform duration-200 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} hidden md:flex flex-col`}>
          <div className="py-3 border-b border-[#303030]">
            <SidebarItem icon={<Home size={24} />} label="Home" active={currentView === 'home'} onClick={() => setCurrentView('home')} />
            <SidebarItem icon={<Flame size={24} />} label="Trending" active={currentView === 'trending'} onClick={() => setCurrentView('trending')} />
            <SidebarItem icon={<MonitorPlay size={24} />} label="Subscriptions" active={currentView === 'subscriptions'} onClick={() => setCurrentView('subscriptions')} />
          </div>
          <div className="py-3 border-b border-[#303030]">
            <h3 className="px-4 py-2 text-md font-semibold mb-1">You</h3>
            <SidebarItem icon={<User size={24} />} label="Your channel" active={currentView === 'channel'} onClick={() => setCurrentView('channel')} />
            <SidebarItem icon={<Clock size={24} />} label="History" active={currentView === 'history'} onClick={() => setCurrentView('history')} />
            <SidebarItem icon={<PlaySquare size={24} />} label="Your videos" active={currentView === 'your_videos'} onClick={() => setCurrentView('your_videos')} />
            <SidebarItem icon={<ThumbsUp size={24} />} label="Liked videos" active={currentView === 'liked_videos'} onClick={() => setCurrentView('liked_videos')} />
          </div>
          
          {/* Game Stats Section */}
          <div className="py-4 px-4 bg-[#272727] m-3 rounded-xl border border-gray-700">
            <h3 className="text-sm text-gray-400 font-semibold mb-3 uppercase tracking-wider">Creator Stats</h3>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Subscribers</span>
                <span className="font-bold text-red-500">{formatViews(mySubscribers)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Views</span>
                <span className="font-bold text-blue-400">{formatViews(totalMyViews)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Your Videos</span>
                <span className="font-bold">{myVideos.length}</span>
              </div>
            </div>
            <button 
              onClick={() => setIsUploadOpen(true)}
              className="w-full mt-4 bg-white text-black py-1.5 rounded-full font-semibold hover:bg-gray-200 transition text-sm"
            >
              Upload Video
            </button>
          </div>
        </aside>

        {/* --- MAIN CONTENT AREA --- */}
        <main className={`flex-1 transition-all duration-200 ${isSidebarOpen && currentView !== 'watch' ? 'md:ml-60' : ''} ${currentView === 'watch' ? 'md:ml-20 lg:ml-0 px-4 lg:px-12 xl:px-24' : 'px-4 sm:px-6'}`}>
          
          {currentView !== 'watch' && (
            <div className="w-full pb-10">
              {/* Category Pills (Only on Home) */}
              {currentView === 'home' && (
                <div className="sticky top-14 bg-[#0f0f0f] z-30 py-3 flex gap-3 overflow-x-auto scrollbar-hide">
                  {categories.map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        categoryFilter === cat ? 'bg-white text-black' : 'bg-[#272727] text-white hover:bg-[#3f3f3f]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {/* View Headers */}
              {currentView === 'trending' && <h2 className="text-2xl font-bold mt-6 mb-4 flex items-center gap-2"><Flame className="text-red-500"/> Trending</h2>}
              {currentView === 'subscriptions' && <h2 className="text-2xl font-bold mt-6 mb-4">Latest from your Subscriptions</h2>}
              {currentView === 'history' && <h2 className="text-2xl font-bold mt-6 mb-4">Watch History</h2>}
              {currentView === 'liked_videos' && <h2 className="text-2xl font-bold mt-6 mb-4">Liked Videos</h2>}
              {(currentView === 'channel' || currentView === 'your_videos') && (
                <div className="mt-8 mb-8 flex items-center gap-6 bg-[#1f1f1f] p-6 rounded-2xl">
                  <img src={channelProfile?.avatar} className="w-24 h-24 rounded-full border-4 border-[#303030]" alt="Channel Avatar" />
                  <div>
                    <h2 className="text-3xl font-bold">{channelProfile?.name}</h2>
                    <p className="text-gray-400 mt-1">@{(channelProfile?.name || '').replace(/\s+/g, '').toLowerCase()}</p>
                    <p className="text-gray-400 mt-1">{formatViews(mySubscribers)} subscribers • {myVideos.length} videos</p>
                  </div>
                </div>
              )}

              {/* Video Grid Render Logic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 mt-4">
                {(() => {
                  let displayVideos = [];
                  if (currentView === 'home') displayVideos = filteredVideos;
                  else if (currentView === 'trending') displayVideos = [...allVideos].sort((a,b) => b.realViews - a.realViews).slice(0, 12);
                  else if (currentView === 'subscriptions') displayVideos = allVideos.filter(v => subscribedChannels[v.channel]);
                  else if (currentView === 'history') displayVideos = watchHistory.map(id => allVideos.find(v => v.id === id)).filter(Boolean);
                  else if (currentView === 'liked_videos') displayVideos = likedVideoIds.map(id => allVideos.find(v => v.id === id)).filter(Boolean);
                  else if (currentView === 'channel' || currentView === 'your_videos') displayVideos = myVideos;

                  if (displayVideos.length === 0) {
                     return (
                       <div className="col-span-full flex flex-col items-center justify-center h-64 text-gray-500">
                         <Search size={48} className="mb-4 opacity-50" />
                         <p className="text-lg">No videos found here.</p>
                       </div>
                     )
                  }

                  return displayVideos.map(video => (
                    <div key={video.id} className="flex flex-col cursor-pointer group" onClick={() => handleWatch(video)}>
                      {/* Thumbnail */}
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-800">
                        {video.isLocal && video.uploaderId !== user?.uid ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-gray-500 text-xs text-center p-4">
                            <PlaySquare size={24} className="mb-2 opacity-50" />
                            Local Video File<br/>(Visible only to {video.channel})
                          </div>
                        ) : (
                          <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        )}
                        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-semibold px-1.5 py-0.5 rounded">
                          {video.duration}
                        </div>
                        {video.uploaderId === user?.uid && (
                          <div className="absolute top-2 left-2 bg-red-600/90 text-white text-xs font-bold px-2 py-1 rounded shadow">
                            YOUR VIDEO
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex gap-3 mt-3">
                        <img src={video.avatar} alt={video.channel} className="w-9 h-9 rounded-full object-cover" />
                        <div className="flex flex-col overflow-hidden">
                          <h3 className="text-[#f1f1f1] text-base font-semibold line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">
                            {video.title}
                          </h3>
                          <p className="text-[#aaaaaa] text-sm mt-1 flex items-center hover:text-white transition-colors">
                            {video.channel}
                          </p>
                          <p className="text-[#aaaaaa] text-sm">
                            {formatViews(video.realViews)} views • {getTimeAgo(video.createdAt)}
                          </p>
                        </div>
                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal size={20} className="text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Load More Videos Button */}
              {currentView === 'home' && filteredVideos.length > 0 && (
                <div className="flex justify-center mt-10 mb-6">
                  <button 
                    onClick={handleLoadMore}
                    className="border border-[#3ea6ff] text-[#3ea6ff] font-semibold px-6 py-2 rounded-full hover:bg-[#3ea6ff]/10 transition-colors"
                  >
                    Load 16 More Videos
                  </button>
                </div>
              )}
            </div>
          )}

          {currentView === 'watch' && activeVideo && (
            <div className="flex flex-col lg:flex-row gap-6 pt-6 pb-20 max-w-[1800px] mx-auto">
              {/* Primary Column */}
              <div className="flex-1 w-full max-w-[1000px] mx-auto lg:mx-0">
                
                {/* Embedded Video Player (Protected by Forcefield) */}
                <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl group flex flex-col justify-center items-center">
                  {activeVideo.isLocal && activeVideo.uploaderId !== user?.uid ? (
                     <div className="text-center p-8 text-gray-400 border border-gray-700 rounded-xl bg-gray-900 w-full h-full flex flex-col justify-center items-center">
                       <PlaySquare size={48} className="mb-4 opacity-50" />
                       <p>This is a local video file uploaded by {activeVideo.channel}.</p>
                       <p className="text-sm mt-2 text-gray-500 max-w-sm">Because this is a multiplayer game simulation, recordings from other players' cameras/devices stay local to them for privacy and performance.</p>
                     </div>
                  ) : ytId ? (
                    <MemoizedYouTubePlayer ytId={ytId} />
                  ) : (
                    <MemoizedVideoPlayer videoUrl={activeVideo.videoUrl} thumbnail={activeVideo.thumbnail} />
                  )}
                </div>

                {/* Video Info */}
                <h1 className="text-xl font-bold mt-4 line-clamp-2">{activeVideo.title}</h1>
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-3 gap-4">
                  <div className="flex items-center gap-4">
                    <img src={activeVideo.avatar} alt={activeVideo.channel} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <h3 className="font-semibold text-[16px]">{activeVideo.channel}</h3>
                      <p className="text-[#aaaaaa] text-xs">
                        {activeVideo.uploaderId === user?.uid ? formatViews(mySubscribers) : formatViews(Math.floor(activeVideo.realViews * 0.1))} subscribers
                      </p>
                    </div>
                    <button 
                      onClick={() => handleSubscribe(activeVideo.channel)}
                      className={`px-4 py-2 rounded-full font-semibold text-sm transition ml-2 ${subscribedChannels[activeVideo.channel] ? 'bg-[#272727] text-white hover:bg-[#3f3f3f]' : 'bg-white text-black hover:bg-gray-200'}`}
                    >
                      {subscribedChannels[activeVideo.channel] ? 'Subscribed' : 'Subscribe'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto scrollbar-hide pb-2 sm:pb-0">
                    <div className="flex bg-[#272727] rounded-full items-center">
                      <button 
                        onClick={() => handleLike(activeVideo)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-l-full border-r border-[#3f3f3f] transition ${likedVideoIds.includes(activeVideo.id) ? 'text-blue-400' : 'hover:bg-[#3f3f3f]'}`}
                      >
                        <ThumbsUp size={20} fill={likedVideoIds.includes(activeVideo.id) ? "currentColor" : "none"} /> <span className="text-sm font-medium">{formatViews(activeVideo.likes)}</span>
                      </button>
                      <button className="px-4 py-2 hover:bg-[#3f3f3f] rounded-r-full transition">
                        <ThumbsDown size={20} />
                      </button>
                    </div>
                    <button 
                      onClick={() => handleShare(activeVideo)}
                      className="flex items-center gap-2 bg-[#272727] hover:bg-[#3f3f3f] px-4 py-2 rounded-full transition whitespace-nowrap"
                    >
                      <Share2 size={20} /> <span className="text-sm font-medium">Share</span>
                    </button>
                  </div>
                </div>

                {/* YouTube-Style Description Box */}
                <div 
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                  className="bg-[#272727] rounded-xl p-3 mt-4 hover:bg-[#3f3f3f] transition-colors cursor-pointer group"
                >
                  <div className="font-semibold text-sm flex gap-2">
                    <span>{formatViews(activeVideo.realViews)} views</span>
                    <span>{getTimeAgo(activeVideo.createdAt)}</span>
                  </div>
                  <p className={`text-sm mt-2 whitespace-pre-wrap ${isDescExpanded ? '' : 'line-clamp-2'}`}>
                    {activeVideo.description}
                  </p>
                  <button className="text-sm font-bold mt-2 text-gray-300">
                    {isDescExpanded ? 'Show less' : '...more'}
                  </button>
                </div>

                {/* Comments Section */}
                <div className="mt-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <MessageSquare size={20} />
                    {activeVideo.comments.length} Comments
                  </h2>
                  
                  {/* Add Comment */}
                  <form onSubmit={(e) => handleAddComment(e, activeVideo)} className="flex gap-4 mb-8">
                    <img src={channelProfile?.avatar} alt="Me" className="w-10 h-10 rounded-full" />
                    <div className="flex-1">
                      <input 
                        name="comment"
                        type="text" 
                        placeholder="Add a comment..." 
                        className="w-full bg-transparent border-b border-[#303030] focus:border-white outline-none py-1 text-sm transition-colors"
                        autoComplete="off"
                      />
                      <div className="flex justify-end mt-2 hidden group-focus-within:flex">
                        <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-blue-700">
                          Comment
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Comment List */}
                  <div className="flex flex-col gap-6">
                    {activeVideo.comments.map((comment, idx) => (
                      <div key={idx} className="flex gap-4">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user}`} alt="avatar" className="w-10 h-10 rounded-full bg-gray-700" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">@{comment.user}</span>
                          </div>
                          <p className="text-sm mt-1">{comment.text}</p>
                          <div className="flex items-center gap-4 mt-2 text-[#aaaaaa]">
                            <button className="hover:text-white"><ThumbsUp size={14} /></button>
                            <button className="hover:text-white"><ThumbsDown size={14} /></button>
                            <span className="text-xs font-medium cursor-pointer hover:text-white">Reply</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Secondary Column (Recommendations) */}
              <div className="w-full lg:w-[400px] flex flex-col gap-3">
                {allVideos.filter(v => v.id !== activeVideo.id).slice(0, 20).map(video => (
                  <div key={video.id} className="flex gap-2 cursor-pointer group" onClick={() => handleWatch(video)}>
                    <div className="relative w-40 min-w-[160px] aspect-video rounded-lg overflow-hidden bg-gray-800">
                      <img src={video.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-semibold px-1 py-0.5 rounded">
                        {video.duration}
                      </div>
                    </div>
                    <div className="flex flex-col py-0.5 pr-2">
                      <h3 className="text-[#f1f1f1] text-sm font-semibold line-clamp-2 leading-tight group-hover:text-blue-400">
                        {video.title}
                      </h3>
                      <p className="text-[#aaaaaa] text-xs mt-1">{video.channel}</p>
                      <p className="text-[#aaaaaa] text-xs">{formatViews(video.realViews)} views • {getTimeAgo(video.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}
        </main>
      </div>

      {/* --- UPLOAD MODAL --- */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#212121] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-[#303030] transform transition-all flex flex-col max-h-[90vh]">
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-[#303030]">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Upload size={24} className="text-red-500" /> Upload Video
              </h2>
              <button onClick={() => setIsUploadOpen(false)} className="p-2 hover:bg-[#303030] rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="p-6 flex flex-col gap-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Video Title</label>
                <input 
                  type="text" 
                  name="title"
                  placeholder="e.g. Check out this awesome clip!" 
                  required
                  className="w-full bg-transparent border border-[#404040] rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Paste a YouTube Link (or record locally)</label>
                <input 
                  type="text" 
                  name="youtubeLink"
                  placeholder="https://www.youtube.com/watch?v=..." 
                  className="w-full bg-transparent border border-[#404040] rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none transition mb-2"
                />
                
                <div className="w-full bg-[#181818] border-2 border-dashed border-[#404040] rounded-lg p-6 text-center hover:border-blue-500 transition-colors relative">
                  <input 
                    type="file" 
                    accept="video/*" 
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {uploadPreview ? (
                    <div className="flex flex-col items-center">
                      <video src={uploadPreview} className="h-32 rounded-lg mb-2 object-cover" muted />
                      <span className="text-sm text-green-400 font-medium">Local Video Selected! Click to change.</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center pointer-events-none">
                      <Upload size={32} className="text-gray-400 mb-2" />
                      <span className="text-sm text-white font-medium">Click to upload file or open camera</span>
                      <span className="text-xs text-gray-500 mt-1">If you don't use a YouTube link, you can upload here.</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                <textarea 
                  name="description"
                  placeholder="Tell viewers about your video" 
                  rows="2"
                  className="w-full bg-transparent border border-[#404040] rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none transition resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
                <select 
                  name="category"
                  className="w-full bg-[#181818] border border-[#404040] rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none transition"
                >
                  <option value="Vlog">Vlog</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Film">Film</option>
                  <option value="Travel">Travel</option>
                  <option value="DIY">DIY</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-4 flex-shrink-0 pb-2">
                <button 
                  type="button" 
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 rounded-full font-medium hover:bg-[#303030] transition text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-bold transition text-sm flex items-center gap-2"
                >
                  <Upload size={16}/> Publish Video
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRM MODAL --- */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#212121] w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-[#303030] p-6 text-center">
            <h2 className="text-xl font-bold text-white mb-2">Delete Account?</h2>
            <p className="text-gray-400 text-sm mb-6">
              Are you sure you want to delete <strong>{channelProfile?.email}</strong>? This will permanently remove your login credentials and free up this email address.
            </p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-full font-medium hover:bg-[#303030] transition text-white text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteAccount}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full font-bold transition text-sm"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- TOAST NOTIFICATION --- */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full shadow-lg font-semibold text-sm transition-all duration-300 z-[200] ${toastMessage ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        {toastMessage}
      </div>

    </div>
  );
}

// Sidebar Item Component
function SidebarItem({ icon, label, active, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center px-4 py-2.5 mx-2 rounded-lg cursor-pointer transition-colors ${
        active ? 'bg-[#272727] font-semibold text-white' : 'hover:bg-[#272727] text-[#f1f1f1]'
      }`}
    >
      <div className="mr-5 text-[#f1f1f1]">
        {icon}
      </div>
      <span className="text-[14px] truncate">{label}</span>
    </div>
  );
}
