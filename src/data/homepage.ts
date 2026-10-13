import type { HomepageContent, Profile, Project } from '../types/content'

// Replace the content here when you are ready. No account, biography or metrics are real.
export const profile: Profile = {
  name: 'YourName',
  names: ['YourName', '保持好奇的人', 'Somebody curious'],
  tagline: 'A little universe of things I love.',
  roles: [
    { label: 'Creative Developer', target: 'code' },
    { label: 'Web Explorer', target: 'code' },
    { label: 'Game Maker', target: 'game' },
    { label: 'Story Collector', target: 'influencer' },
    { label: 'Music Lover', target: 'music' },
    { label: 'Lifelong Learner', target: 'books' },
  ],
  city: 'Somewhere on Earth',
  email: '',
  intro: 'I share stories about #programming, #gaming, #creativity and #life on the Internet.',
  statement: 'There are countless ways to tell a story about the world, this is mine.',
  contact: "I'm always curious about new ideas and the people behind them. Let's make something interesting together.",
  socials: [
    { id: 'github', name: 'GitHub', handle: '@yourname', metric: 128, unit: 'repositories', color: '#334155', description: 'Small experiments, useful tools, and things built out of curiosity.', url: '' },
    { id: 'bilibili', name: 'Bilibili', handle: '你的频道', metric: 2048, unit: 'followers', color: '#ed729c', description: '把学习的过程变成故事，分享代码背后的想法与灵感。', url: '' },
    { id: 'twitter', name: 'Thoughts', handle: '@yourname', metric: 365, unit: 'little thoughts', color: '#5599b4', description: 'A notebook for passing thoughts, discoveries, and everyday moments.', url: '' },
    { id: 'instagram', name: 'Photography', handle: '你的生活切片', metric: 96, unit: 'moments', color: '#bb815e', description: 'A collection of light, quiet streets, and places I want to remember.', url: '' },
    { id: 'music', name: 'Playlists', handle: '耳机里的世界', metric: 24, unit: 'playlists', color: '#729788', description: 'Soundtracks for late-night coding, long walks, and doing absolutely nothing.', url: '' },
    { id: 'book', name: 'Reading', handle: '一页又一页', metric: 52, unit: 'books', color: '#a394c2', description: 'Ideas borrowed from other minds. Books I loved and notes worth keeping.', url: '' },
  ],
}

export const workProjects: Project[] = [
  { id: 'atlas', title: 'Atlas Workspace', subtitle: 'A small home for big ideas.', description: '这是一个工作空间产品的占位项目。你可以在这里介绍项目解决的问题、承担的角色，以及最值得分享的设计或技术细节。', tags: ['React', 'TypeScript', 'Design'], art: 'code' },
  { id: 'open-web', title: 'Open Web Toolkit', subtitle: 'Thoughtful tools for the open web.', description: '这是一个开源工具集的占位项目。用你的真实贡献、项目截图和仓库地址替换这里的内容。技能卡片与项目之间的连线用于展示技术关联。', tags: ['TypeScript', 'React', 'Rust'], art: 'shapes' },
  { id: 'little-lab', title: 'Little Experiments', subtitle: 'Learning by making things.', description: '这是一个个人实验集合的占位项目。可以放入浏览器实验、数据可视化、小工具，或者一次有趣的技术探索。', tags: ['Python', 'Design'], art: 'waves' },
]

export const games: Project[] = [
  { id: 'moon-forest', title: 'Moonlit Forest', subtitle: 'A tiny adventure in a quiet world.', description: 'Game Jam 占位项目：一个关于探索、月光与森林的小故事。这里可以写开发时间、团队分工、玩法设计和体验链接。', tags: ['Unity', 'C#', 'Game Jam'], art: 'forest' },
  { id: 'two-cats', title: 'Two Little Cats', subtitle: 'A cozy puzzle for two curious friends.', description: '合作解谜游戏占位项目：两只小猫，一扇门，以及很多出乎意料的解法。用你自己的游戏截图和故事替换这张卡片。', tags: ['Unity', 'C#', 'Game Jam'], art: 'cats' },
  { id: 'orbit', title: 'Lost in Orbit', subtitle: 'One little ship. An endless universe.', description: '太空游戏占位项目：在有限的资源中探索一片未知的星空。适合介绍一次个人开发实验。', tags: ['TypeScript', 'Canvas'], art: 'space' },
  { id: 'northbound', title: 'NORTHBOUND', subtitle: 'Find your own way.', description: '团队作品占位项目：一段穿过群山的旅程。这里可以放入大型项目经历、负责的模块和最终成果。', tags: ['C++', 'Game Design'], art: 'mountain' },
  { id: 'playground', title: 'Little Playground', subtitle: 'Make a little room for play.', description: '交互作品占位项目：把日常生活中的小物件变成一个充满可能性的游乐场。', tags: ['TypeScript', 'Design'], art: 'tiles' },
]

export const essays: Project[] = [
  { id: 'worlds', title: 'Building little worlds', subtitle: 'What makes a world feel alive?', description: '内容作品占位：聊聊虚拟世界、真实感与想象力。可以替换成你的文章、视频或播客。', tags: ['Worldbuilding', 'Essay'], art: 'mountain' },
  { id: 'play', title: 'Why we play', subtitle: 'Curiosity is a powerful thing.', description: '内容作品占位：从好奇心出发，思考游戏为什么能让我们投入其中。', tags: ['Psychology', 'Games'], art: 'shapes' },
  { id: 'chance', title: 'A beautiful accident', subtitle: 'A little randomness goes a long way.', description: '内容作品占位：关于随机性、涌现与设计中的意外惊喜。', tags: ['Design', 'Randomness'], art: 'tiles' },
  { id: 'patterns', title: 'Finding the patterns', subtitle: 'Stories hiding inside the data.', description: '内容作品占位：用数据发现日常中的规律，将复杂的事情讲清楚。', tags: ['Python', 'Data'], art: 'waves' },
]

export const musicProjects: Project[] = [
  { id: 'band', title: 'The Weekend Band', subtitle: 'Good friends. A few imperfect songs.', description: '音乐经历占位：一次排练、一场演出，或者和朋友们一起完成的一首歌。', tags: ['Band', 'Guitar'], art: 'studio' },
  { id: 'sound', title: 'Sound, with code', subtitle: 'When a loop becomes a melody.', description: '声音实验占位：通过代码、节奏和合成器探索音乐。可以链接到你自己的录音或演示。', tags: ['Web Audio', 'Creative Coding'], art: 'waves' },
  { id: 'synth', title: 'Sunday Sessions', subtitle: 'Turn a knob. Follow the sound.', description: '合成器演奏占位：记录一个悠闲下午的声音探索。', tags: ['Synthesizer', 'Ambient'], art: 'studio' },
]

export const skills = [
  { name: 'JavaScript / TypeScript', tag: 'TypeScript', level: 9, note: '从小工具到完整的交互体验，探索浏览器的可能性。' },
  { name: 'React / Next.js', tag: 'React', level: 9, note: '组件、状态和细节：让想法成为可以使用的产品。' },
  { name: 'C# / .NET', tag: 'C#', level: 7, note: '游戏原型与服务端实验。这里的熟练度为演示数据。' },
  { name: 'Design / Figma', tag: 'Design', level: 7, note: '关注排版、交互和每一个微小的使用体验。' },
  { name: 'C++', tag: 'C++', level: 6, note: '理解程序如何运行，也理解抽象背后的细节。' },
  { name: 'Python', tag: 'Python', level: 8, note: '分析数据、自动化重复工作，以及验证有趣的想法。' },
  { name: 'Rust', tag: 'Rust', level: 4, note: '仍在学习中。享受用不同的方式思考问题。' },
  { name: 'Unity / Game Design', tag: 'Unity', level: 6, note: '做一点小小的游戏，给日常留一点玩心。' },
]

export const books = [
  { title: 'The Art of Noticing', author: 'Sample Author', color: '#e7a565', category: 'Favorites', subtitle: 'SEE THE EVERYDAY / DIFFERENTLY' },
  { title: 'A World of Ideas', author: 'Sample Author', color: '#7f9c91', category: 'Favorites', subtitle: 'STAY CURIOUS' },
  { title: 'Ways of Making', author: 'Sample Author', color: '#a9b8c6', category: 'Favorites', subtitle: 'THOUGHTS INTO THINGS' },
  { title: 'Quiet Signals', author: 'Sample Author', color: '#b29cb5', category: 'Reading', subtitle: 'LESS, BUT BETTER' },
  { title: 'The Long Way Home', author: 'Sample Author', color: '#d8c7a3', category: 'Reading', subtitle: 'NOTES FROM ELSEWHERE' },
  { title: 'Beyond the Page', author: 'Sample Author', color: '#cc7f6c', category: 'Want to read', subtitle: 'A NEW CHAPTER' },
]

export const homepageContent: HomepageContent = {
  schemaVersion: 1,
  isDemo: true,
  profile,
  // Order controls page order; hide a section without changing components.
  sections: [
    { id: 'influencer', label: 'Stories', enabled: true, inNavigation: true },
    { id: 'code', label: 'Code', enabled: true, inNavigation: true },
    { id: 'game', label: 'Game', enabled: true, inNavigation: true },
    { id: 'video', label: 'Essays', enabled: true, inNavigation: false },
    { id: 'music', label: 'Music', enabled: true, inNavigation: true },
    { id: 'statistics', label: 'Life', enabled: true, inNavigation: false },
    { id: 'books', label: 'Books', enabled: true, inNavigation: true },
  ],
  projects: { work: workProjects, games, essays, music: musicProjects },
  skills,
  books,
  copy: {
    stories: { title: 'Storytelling is a way of connecting the dots.', description: "A few things I've made, learned, and loved along the way." },
    work: { title: 'My work', introduction: 'I build things for the web.\nSome useful, some playful.\nAlways a little curious.', openSourceTitle: 'Open source', openSourceLead: "Good ideas grow when they're shared.", openSourceDescription: 'I enjoy building in the open, learning from others, and giving a little back.' },
    essays: { title: 'Stories behind the screen', name: 'The curious corner', introduction: "I'm not only playing games.\nI'm collecting ways to see the world.", description: 'Exploring human behavior, product design, and the little things that make an experience memorable.', topics: ['Worldbuilding', 'Psychology', 'Design', 'Randomness', 'Data', 'Games'] },
    music: { introduction: 'I enjoy the space between a few notes. A guitar, a synthesizer, a small idea that becomes a sound.', description: 'No grand ambitions.\nJust making a little noise.', gear: ['Electric guitar', 'Small synthesizer', 'Audio interface', 'Endless possibilities'] },
    reading: { introduction: 'A few borrowed ideas.\nA few new ways of seeing.', description: 'Books that stay with me\nlong after the last page.' },
  },
  statistics: {
    ages: [10, 15, 20, 25, 30],
    time: [
      { label: 'Learning', values: [62, 55, 34, 23, 20], color: '#aac7b8' },
      { label: 'Music', values: [8, 15, 15, 12, 17], color: '#d3bdd1' },
      { label: 'Games', values: [20, 18, 15, 13, 9], color: '#e4c89f' },
      { label: 'Coding', values: [0, 4, 25, 35, 34], color: '#aabfd2' },
      { label: 'Life', values: [10, 8, 11, 17, 20], color: '#e1b3a0' },
    ],
    movies: [
      { label: 'Drama', value: 35, color: '#afc5b9' }, { label: 'Animation', value: 25, color: '#e2c396' },
      { label: 'Sci-fi', value: 22, color: '#a8bdd1' }, { label: 'Comedy', value: 18, color: '#d0b5ca' },
    ],
    music: [
      { label: 'Indie', value: 42, color: '#afc5b9' }, { label: 'Rock', value: 28, color: '#e2c396' },
      { label: 'Electronic', value: 19, color: '#a8bdd1' }, { label: 'Jazz', value: 11, color: '#d0b5ca' },
    ],
  },
}
