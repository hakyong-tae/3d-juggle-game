// ─── Lobby UI ─────────────────────────────────────────────────────────────────
import { sfx } from './sfx.js'
import { submitScore, fetchLeaderboard, fetchWCLeaderboard, flushPending } from './leaderboard.js'
import { showRewarded, showInterstitial, PLACEMENTS, isBusy, isUnsupportedEnv } from './ads.js'

const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
}

// ─── i18n ─────────────────────────────────────────────────────────────────────
const STRINGS = {
  en: {
    tabShop:'Shop', tabRanks:'Ranks', tabSettings:'Settings',
    statBest:'Best', statLast:'Last', statGames:'Games',
    classicName:'Classic',    classicDesc:'Juggle as long as you can',
    taName:'Time Attack',     taDesc:'Max kicks in 30 seconds',
    chName:'Challenge',       chDesc:'Max height in 30 seconds',
    playBtn:'PLAY', coinLabel:'coins',
    lbEmpty:'No scores yet!',
    lbClassic:'Classic', lbTA:'Time Attack', lbCH:'Challenge',
    goOver:'GAME OVER', goNew:'🏆 NEW BEST!',
    nameTitle:'🏆 New Best!', nameSub:'Enter your name for the leaderboard',
    namePH:'Your name (English)...', nameSave:'Save', nameSkip:'Skip',
    sSound:'Sound',     sSoundSub:'Kick & UI sounds',
    sHaptics:'Haptics', sHapticsSub:'Vibration on kick',
    sParticles:'Particles', sParticlesSub:'Kick visual effects',
    sSlowMo:'Slow Motion', sSlowMoSub:'Replay when ball drops',
    sMusic:'Music',
    sLang:'Language', sLangSub:'English / Korean',
    sVersion:'Version', sPlaylist:'PLAYLIST', bgmSection:'BGM',
    hint0:'Move your foot to control it',
    hint1:'Keep the ball in the air!',
    hint2:'Coins, wind & obstacles ahead!',
    hintOk:'Got it',
    charsTitle:'PLAYERS',
    equippedBtn:'✓ ON', wearBtn:'WEAR',
    annCoin:'🪙 Air Coins!',
    annWind:'🌬️ Wind starts blowing!',
    annObs:'⚠️ Watch out! Obstacles!',
    kicks:'KICKS', height:'HEIGHT',
    // Ball names
    bTennis:'Tennis',
    bSoccerClassic:'Classic', bSoccerFire:'Fire',
    bSoccerNight:'Night',     bSoccerGold:'Gold',
    bBasketball:'Basketball', bVolleyball:'Volleyball', bBaseball:'Baseball',
    bVintage:'Vintage',       bWC26:'WC26 Official',
    bTrionda:'Trionda 2026',
    bPingpongW:'Ping Pong (W)', bPingpongO:'Ping Pong (O)',
    // Ball gimmick descs
    gBallBasketball:'🏋 Heavy',       gBallVolleyball:'🪶 Light',
    gBallPingpong:'💨 Super Light',   gBallGold:'⭐ 1.2× Score',
    gBallTennis:'🎾 Light & Bouncy',  gBallBaseball:'⚾ Hard Bounce',
    gBallWC26:'🏆 +15% Score',        gBallTrionda:'🌍 +20% Score',
    // Stadium names
    sStreet:'Street', sStadium:'Stadium', sNight:'Night', sBeach:'Beach', sSpace:'Space',
    // Stadium gimmick descs
    gStadStadium:'⚡ 1.5× Score', gStadNight:'🌙 Slow Ball',
    gStadBeach:'↔ Wide Court',   gStadSpace:'🪐 Low Gravity',
    // Item action buttons
    itemEquipped:'✓ Equipped', itemEquip:'Equip',
  },
  ko: {
    tabShop:'샵', tabRanks:'랭킹', tabSettings:'설정',
    statBest:'최고', statLast:'마지막', statGames:'게임수',
    classicName:'Classic',    classicDesc:'최대한 오래 저글링하세요',
    taName:'Time Attack',     taDesc:'30초 안에 최대 킥 횟수',
    chName:'Challenge',       chDesc:'30초 안에 최고 높이 도전',
    playBtn:'PLAY', coinLabel:'코인',
    lbEmpty:'기록이 없어요!',
    lbClassic:'Classic', lbTA:'Time Attack', lbCH:'Challenge',
    goOver:'게임 오버', goNew:'🏆 신기록!',
    nameTitle:'🏆 신기록!', nameSub:'리더보드에 올릴 이름을 입력하세요',
    namePH:'이름 입력 (영어)...', nameSave:'저장', nameSkip:'건너뛰기',
    sSound:'사운드',   sSoundSub:'킥 & UI 사운드',
    sHaptics:'진동',   sHapticsSub:'킥 시 진동',
    sParticles:'파티클', sParticlesSub:'킥 시각 효과',
    sSlowMo:'슬로우 모션', sSlowMoSub:'공 떨어질 때 리플레이',
    sMusic:'음악',
    sLang:'언어', sLangSub:'영어 / 한국어',
    sVersion:'버전', sPlaylist:'플레이리스트', bgmSection:'BGM',
    hint0:'발을 움직여서 조종하세요',
    hint1:'공이 바닥에 닿기 전에 차세요!',
    hint2:'코인, 바람, 장애물이 등장해요!',
    hintOk:'확인',
    charsTitle:'선수',
    equippedBtn:'✓ 착용중', wearBtn:'착용',
    annCoin:'🪙 공중 코인 등장!',
    annWind:'🌬️ 바람이 불기 시작했다!',
    annObs:'⚠️ 장애물 등장! 피해라!',
    kicks:'킥수', height:'높이',
    // Ball names
    bTennis:'테니스',
    bSoccerClassic:'클래식', bSoccerFire:'파이어',
    bSoccerNight:'나이트',    bSoccerGold:'골드',
    bBasketball:'농구공', bVolleyball:'배구공', bBaseball:'야구공',
    bVintage:'빈티지',         bWC26:'WC26 공식구',
    bTrionda:'트리온다 2026',
    bPingpongW:'탁구공 (흰)', bPingpongO:'탁구공 (주황)',
    // Ball gimmick descs
    gBallBasketball:'🏋 무거움',     gBallVolleyball:'🪶 가벼움',
    gBallPingpong:'💨 초경량',       gBallGold:'⭐ 1.2× 점수',
    gBallTennis:'🎾 가볍고 잘 튀김', gBallBaseball:'⚾ 강한 반발',
    gBallWC26:'🏆 +15% 점수',        gBallTrionda:'🌍 +20% 점수',
    // Stadium names
    sStreet:'스트리트', sStadium:'스타디움', sNight:'나이트', sBeach:'비치', sSpace:'스페이스',
    // Stadium gimmick descs
    gStadStadium:'⚡ 1.5× 점수', gStadNight:'🌙 느린 공',
    gStadBeach:'↔ 넓은 코트',    gStadSpace:'🪐 저중력',
    // Item action buttons
    itemEquipped:'✓ 착용중', itemEquip:'착용',
  },

  // ─── Japanese ────────────────────────────────────────────────────────────────
  ja: {
    tabShop:'ショップ', tabRanks:'ランキング', tabSettings:'設定',
    statBest:'最高', statLast:'前回', statGames:'ゲーム数',
    classicName:'クラシック', classicDesc:'できるだけ長くジャグリング',
    taName:'タイムアタック', taDesc:'30秒で最大キック数',
    chName:'チャレンジ', chDesc:'30秒で最高の高さ',
    playBtn:'プレイ', coinLabel:'コイン',
    lbEmpty:'まだ記録なし！',
    lbClassic:'クラシック', lbTA:'タイムアタック', lbCH:'チャレンジ',
    goOver:'ゲームオーバー', goNew:'🏆 新記録！',
    nameTitle:'🏆 新記録！', nameSub:'リーダーボードに名前を入力',
    namePH:'名前（英語）...', nameSave:'保存', nameSkip:'スキップ',
    sSound:'サウンド', sSoundSub:'キックとUIサウンド',
    sHaptics:'バイブ', sHapticsSub:'キック時に振動',
    sParticles:'パーティクル', sParticlesSub:'キックのビジュアルエフェクト',
    sSlowMo:'スローモーション', sSlowMoSub:'ボールが落ちたときリプレイ',
    sMusic:'音楽', sLang:'言語', sLangSub:'言語を変更',
    sVersion:'バージョン', sPlaylist:'プレイリスト', bgmSection:'BGM',
    hint0:'足を動かして操作しよう', hint1:'ボールを空中に保って！',
    hint2:'コイン・風・障害物が登場！', hintOk:'わかった',
    charsTitle:'プレイヤー', equippedBtn:'✓ 装備中', wearBtn:'装備',
    annCoin:'🪙 空中コイン出現！', annWind:'🌬️ 風が吹き始めた！', annObs:'⚠️ 障害物に注意！',
    kicks:'キック', height:'高さ',
    bTennis:'テニス', bSoccerClassic:'クラシック', bSoccerFire:'ファイヤー',
    bSoccerNight:'ナイト', bSoccerGold:'ゴールド',
    bBasketball:'バスケ', bVolleyball:'バレー', bBaseball:'ベースボール',
    bVintage:'ヴィンテージ', bWC26:'WC26公式球', bTrionda:'トリオンダ2026',
    bPingpongW:'卓球（白）', bPingpongO:'卓球（橙）',
    gBallBasketball:'🏋 重い', gBallVolleyball:'🪶 軽い', gBallPingpong:'💨 超軽量',
    gBallGold:'⭐ 1.2× スコア', gBallTennis:'🎾 軽くてよく跳ねる', gBallBaseball:'⚾ 強い反発',
    gBallWC26:'🏆 +15% スコア', gBallTrionda:'🌍 +20% スコア',
    sStreet:'ストリート', sStadium:'スタジアム', sNight:'ナイト', sBeach:'ビーチ', sSpace:'スペース',
    gStadStadium:'⚡ 1.5× スコア', gStadNight:'🌙 遅いボール',
    gStadBeach:'↔ 広いコート', gStadSpace:'🪐 低重力',
    itemEquipped:'✓ 装備中', itemEquip:'装備',
  },

  // ─── Chinese ─────────────────────────────────────────────────────────────────
  zh: {
    tabShop:'商店', tabRanks:'排行榜', tabSettings:'设置',
    statBest:'最佳', statLast:'上次', statGames:'局数',
    classicName:'经典', classicDesc:'尽可能久地颠球',
    taName:'限时挑战', taDesc:'30秒内最多脚踢数',
    chName:'高度挑战', chDesc:'30秒内最高高度',
    playBtn:'开始', coinLabel:'金币',
    lbEmpty:'暂无记录！',
    lbClassic:'经典', lbTA:'限时', lbCH:'高度',
    goOver:'游戏结束', goNew:'🏆 新纪录！',
    nameTitle:'🏆 新纪录！', nameSub:'输入名字上排行榜',
    namePH:'你的名字（英文）...', nameSave:'保存', nameSkip:'跳过',
    sSound:'音效', sSoundSub:'踢球和UI音效',
    sHaptics:'震动', sHapticsSub:'踢球时震动',
    sParticles:'粒子特效', sParticlesSub:'踢球视觉效果',
    sSlowMo:'慢动作', sSlowMoSub:'球落地时回放',
    sMusic:'音乐', sLang:'语言', sLangSub:'切换语言',
    sVersion:'版本', sPlaylist:'播放列表', bgmSection:'背景音乐',
    hint0:'移动脚来控制', hint1:'保持球在空中！',
    hint2:'金币、风和障碍物来了！', hintOk:'明白了',
    charsTitle:'球员', equippedBtn:'✓ 装备中', wearBtn:'装备',
    annCoin:'🪙 空中金币出现！', annWind:'🌬️ 风开始吹了！', annObs:'⚠️ 注意障碍物！',
    kicks:'脚踢', height:'高度',
    bTennis:'网球', bSoccerClassic:'经典', bSoccerFire:'火焰',
    bSoccerNight:'夜晚', bSoccerGold:'金球',
    bBasketball:'篮球', bVolleyball:'排球', bBaseball:'棒球',
    bVintage:'复古', bWC26:'WC26官方球', bTrionda:'特里昂达2026',
    bPingpongW:'乒乓球（白）', bPingpongO:'乒乓球（橙）',
    gBallBasketball:'🏋 重', gBallVolleyball:'🪶 轻', gBallPingpong:'💨 超轻',
    gBallGold:'⭐ 1.2× 分数', gBallTennis:'🎾 轻且弹跳', gBallBaseball:'⚾ 强弹跳',
    gBallWC26:'🏆 +15% 分数', gBallTrionda:'🌍 +20% 分数',
    sStreet:'街道', sStadium:'体育场', sNight:'夜晚', sBeach:'海滩', sSpace:'太空',
    gStadStadium:'⚡ 1.5× 分数', gStadNight:'🌙 慢球',
    gStadBeach:'↔ 宽场地', gStadSpace:'🪐 低重力',
    itemEquipped:'✓ 已装备', itemEquip:'装备',
  },

  // ─── Spanish ─────────────────────────────────────────────────────────────────
  es: {
    tabShop:'Tienda', tabRanks:'Rankings', tabSettings:'Ajustes',
    statBest:'Mejor', statLast:'Último', statGames:'Partidas',
    classicName:'Clásico', classicDesc:'Haz malabarismos lo más posible',
    taName:'Contrarreloj', taDesc:'Máx. golpes en 30 segundos',
    chName:'Desafío', chDesc:'Máxima altura en 30 segundos',
    playBtn:'JUGAR', coinLabel:'monedas',
    lbEmpty:'¡Sin puntuaciones aún!',
    lbClassic:'Clásico', lbTA:'Contrarreloj', lbCH:'Desafío',
    goOver:'FIN DEL JUEGO', goNew:'🏆 ¡NUEVO RÉCORD!',
    nameTitle:'🏆 ¡Nuevo Récord!', nameSub:'Ingresa tu nombre para el marcador',
    namePH:'Tu nombre (inglés)...', nameSave:'Guardar', nameSkip:'Omitir',
    sSound:'Sonido', sSoundSub:'Sonidos de patada y UI',
    sHaptics:'Vibración', sHapticsSub:'Vibración al patear',
    sParticles:'Partículas', sParticlesSub:'Efectos visuales al patear',
    sSlowMo:'Cámara Lenta', sSlowMoSub:'Repetición al caer la pelota',
    sMusic:'Música', sLang:'Idioma', sLangSub:'Cambiar idioma',
    sVersion:'Versión', sPlaylist:'Lista', bgmSection:'Música',
    hint0:'Mueve tu pie para controlarlo', hint1:'¡Mantén la pelota en el aire!',
    hint2:'¡Monedas, viento y obstáculos!', hintOk:'Entendido',
    charsTitle:'JUGADORES', equippedBtn:'✓ EN USO', wearBtn:'EQUIPAR',
    annCoin:'🪙 ¡Monedas en el aire!', annWind:'🌬️ ¡Empieza el viento!', annObs:'⚠️ ¡Cuidado! Obstáculos',
    kicks:'GOLPES', height:'ALTURA',
    bTennis:'Tenis', bSoccerClassic:'Clásico', bSoccerFire:'Fuego',
    bSoccerNight:'Noche', bSoccerGold:'Oro',
    bBasketball:'Baloncesto', bVolleyball:'Vóley', bBaseball:'Béisbol',
    bVintage:'Vintage', bWC26:'Oficial WC26', bTrionda:'Trionda 2026',
    bPingpongW:'Ping Pong (B)', bPingpongO:'Ping Pong (N)',
    gBallBasketball:'🏋 Pesado', gBallVolleyball:'🪶 Ligero', gBallPingpong:'💨 Ultraligero',
    gBallGold:'⭐ 1.2× Puntos', gBallTennis:'🎾 Ligero y Rebotador', gBallBaseball:'⚾ Rebote Fuerte',
    gBallWC26:'🏆 +15% Puntos', gBallTrionda:'🌍 +20% Puntos',
    sStreet:'Calle', sStadium:'Estadio', sNight:'Noche', sBeach:'Playa', sSpace:'Espacio',
    gStadStadium:'⚡ 1.5× Puntos', gStadNight:'🌙 Pelota Lenta',
    gStadBeach:'↔ Cancha Ancha', gStadSpace:'🪐 Baja Gravedad',
    itemEquipped:'✓ Equipado', itemEquip:'Equipar',
  },

  // ─── Portuguese ──────────────────────────────────────────────────────────────
  pt: {
    tabShop:'Loja', tabRanks:'Rankings', tabSettings:'Configurações',
    statBest:'Melhor', statLast:'Último', statGames:'Partidas',
    classicName:'Clássico', classicDesc:'Juggle o máximo possível',
    taName:'Contra o Tempo', taDesc:'Máx. chutes em 30 segundos',
    chName:'Desafio', chDesc:'Máxima altura em 30 segundos',
    playBtn:'JOGAR', coinLabel:'moedas',
    lbEmpty:'Sem pontuações ainda!',
    lbClassic:'Clássico', lbTA:'Contra o Tempo', lbCH:'Desafio',
    goOver:'FIM DE JOGO', goNew:'🏆 NOVO RECORDE!',
    nameTitle:'🏆 Novo Recorde!', nameSub:'Digite seu nome para o placar',
    namePH:'Seu nome (inglês)...', nameSave:'Salvar', nameSkip:'Pular',
    sSound:'Som', sSoundSub:'Sons de chute e UI',
    sHaptics:'Vibração', sHapticsSub:'Vibração ao chutar',
    sParticles:'Partículas', sParticlesSub:'Efeitos visuais ao chutar',
    sSlowMo:'Câmera Lenta', sSlowMoSub:'Replay quando a bola cai',
    sMusic:'Música', sLang:'Idioma', sLangSub:'Mudar idioma',
    sVersion:'Versão', sPlaylist:'Playlist', bgmSection:'Música',
    hint0:'Mova seu pé para controlá-lo', hint1:'Mantenha a bola no ar!',
    hint2:'Moedas, vento e obstáculos!', hintOk:'Entendi',
    charsTitle:'JOGADORES', equippedBtn:'✓ EQUIPADO', wearBtn:'EQUIPAR',
    annCoin:'🪙 Moedas no ar!', annWind:'🌬️ O vento começou!', annObs:'⚠️ Obstáculos à frente!',
    kicks:'CHUTES', height:'ALTURA',
    bTennis:'Tênis', bSoccerClassic:'Clássico', bSoccerFire:'Fogo',
    bSoccerNight:'Noite', bSoccerGold:'Ouro',
    bBasketball:'Basquete', bVolleyball:'Vôlei', bBaseball:'Beisebol',
    bVintage:'Vintage', bWC26:'Oficial WC26', bTrionda:'Trionda 2026',
    bPingpongW:'Ping Pong (B)', bPingpongO:'Ping Pong (L)',
    gBallBasketball:'🏋 Pesada', gBallVolleyball:'🪶 Leve', gBallPingpong:'💨 Ultraleve',
    gBallGold:'⭐ 1.2× Pontos', gBallTennis:'🎾 Leve e Quicante', gBallBaseball:'⚾ Quique Forte',
    gBallWC26:'🏆 +15% Pontos', gBallTrionda:'🌍 +20% Pontos',
    sStreet:'Rua', sStadium:'Estádio', sNight:'Noite', sBeach:'Praia', sSpace:'Espaço',
    gStadStadium:'⚡ 1.5× Pontos', gStadNight:'🌙 Bola Lenta',
    gStadBeach:'↔ Quadra Larga', gStadSpace:'🪐 Baixa Gravidade',
    itemEquipped:'✓ Equipado', itemEquip:'Equipar',
  },

  // ─── Hindi ───────────────────────────────────────────────────────────────────
  hi: {
    tabShop:'दुकान', tabRanks:'रैंकिंग', tabSettings:'सेटिंग',
    statBest:'सर्वश्रेष्ठ', statLast:'पिछला', statGames:'खेल',
    classicName:'क्लासिक', classicDesc:'जितना हो सके उतना जगल करें',
    taName:'टाइम अटैक', taDesc:'30 सेकंड में अधिकतम किक',
    chName:'चैलेंज', chDesc:'30 सेकंड में अधिकतम ऊंचाई',
    playBtn:'खेलें', coinLabel:'सिक्के',
    lbEmpty:'अभी तक कोई स्कोर नहीं!',
    lbClassic:'क्लासिक', lbTA:'टाइम अटैक', lbCH:'चैलेंज',
    goOver:'गेम ओवर', goNew:'🏆 नया रिकॉर्ड!',
    nameTitle:'🏆 नया रिकॉर्ड!', nameSub:'लीडरबोर्ड के लिए नाम दर्ज करें',
    namePH:'आपका नाम (अंग्रेज़ी)...', nameSave:'सेव', nameSkip:'छोड़ें',
    sSound:'आवाज़', sSoundSub:'किक और UI ध्वनियाँ',
    sHaptics:'वाइब्रेशन', sHapticsSub:'किक पर वाइब्रेशन',
    sParticles:'इफेक्ट', sParticlesSub:'किक के विज़ुअल इफेक्ट',
    sSlowMo:'स्लो मोशन', sSlowMoSub:'बॉल गिरने पर रिप्ले',
    sMusic:'संगीत', sLang:'भाषा', sLangSub:'भाषा बदलें',
    sVersion:'वर्शन', sPlaylist:'प्लेलिस्ट', bgmSection:'BGM',
    hint0:'पैर हिलाएं और कंट्रोल करें', hint1:'गेंद को हवा में रखें!',
    hint2:'सिक्के, हवा और बाधाएं आ रही हैं!', hintOk:'समझ गया',
    charsTitle:'खिलाड़ी', equippedBtn:'✓ पहना', wearBtn:'पहनें',
    annCoin:'🪙 हवाई सिक्के!', annWind:'🌬️ हवा चलने लगी!', annObs:'⚠️ बाधाओं से बचें!',
    kicks:'किक', height:'ऊंचाई',
    bTennis:'टेनिस', bSoccerClassic:'क्लासिक', bSoccerFire:'फायर',
    bSoccerNight:'नाइट', bSoccerGold:'गोल्ड',
    bBasketball:'बास्केटबॉल', bVolleyball:'वॉलीबॉल', bBaseball:'बेसबॉल',
    bVintage:'विंटेज', bWC26:'WC26 ऑफिशियल', bTrionda:'Trionda 2026',
    bPingpongW:'पिंग पोंग (सफेद)', bPingpongO:'पिंग पोंग (नारंगी)',
    gBallBasketball:'🏋 भारी', gBallVolleyball:'🪶 हल्का', gBallPingpong:'💨 अति-हल्का',
    gBallGold:'⭐ 1.2× स्कोर', gBallTennis:'🎾 हल्का और उछलने वाला', gBallBaseball:'⚾ तेज़ उछाल',
    gBallWC26:'🏆 +15% स्कोर', gBallTrionda:'🌍 +20% स्कोर',
    sStreet:'गली', sStadium:'स्टेडियम', sNight:'रात', sBeach:'समुद्र तट', sSpace:'अंतरिक्ष',
    gStadStadium:'⚡ 1.5× स्कोर', gStadNight:'🌙 धीमी गेंद',
    gStadBeach:'↔ चौड़ा मैदान', gStadSpace:'🪐 कम गुरुत्वाकर्षण',
    itemEquipped:'✓ पहना', itemEquip:'पहनें',
  },

  // ─── Vietnamese ──────────────────────────────────────────────────────────────
  vi: {
    tabShop:'Cửa hàng', tabRanks:'Xếp hạng', tabSettings:'Cài đặt',
    statBest:'Tốt nhất', statLast:'Lần cuối', statGames:'Ván chơi',
    classicName:'Cổ điển', classicDesc:'Tung hứng càng lâu càng tốt',
    taName:'Đua tốc độ', taDesc:'Tối đa cú đá trong 30 giây',
    chName:'Thử thách', chDesc:'Độ cao tối đa trong 30 giây',
    playBtn:'CHƠI', coinLabel:'xu',
    lbEmpty:'Chưa có điểm nào!',
    lbClassic:'Cổ điển', lbTA:'Đua tốc độ', lbCH:'Thử thách',
    goOver:'KẾT THÚC', goNew:'🏆 KỶ LỤC MỚI!',
    nameTitle:'🏆 Kỷ lục mới!', nameSub:'Nhập tên vào bảng xếp hạng',
    namePH:'Tên của bạn (tiếng Anh)...', nameSave:'Lưu', nameSkip:'Bỏ qua',
    sSound:'Âm thanh', sSoundSub:'Âm thanh đá bóng và UI',
    sHaptics:'Rung', sHapticsSub:'Rung khi đá bóng',
    sParticles:'Hiệu ứng', sParticlesSub:'Hiệu ứng hình ảnh khi đá',
    sSlowMo:'Chậm', sSlowMoSub:'Phát lại khi bóng rơi',
    sMusic:'Nhạc', sLang:'Ngôn ngữ', sLangSub:'Đổi ngôn ngữ',
    sVersion:'Phiên bản', sPlaylist:'Danh sách', bgmSection:'Nhạc nền',
    hint0:'Di chuyển chân để điều khiển', hint1:'Giữ bóng trên không!',
    hint2:'Xu, gió và chướng ngại vật!', hintOk:'Hiểu rồi',
    charsTitle:'CẦU THỦ', equippedBtn:'✓ ĐÃ MẶC', wearBtn:'MẶC',
    annCoin:'🪙 Xu xuất hiện!', annWind:'🌬️ Gió bắt đầu thổi!', annObs:'⚠️ Chú ý chướng ngại vật!',
    kicks:'ĐÁ', height:'ĐỘ CAO',
    bTennis:'Quần vợt', bSoccerClassic:'Cổ điển', bSoccerFire:'Lửa',
    bSoccerNight:'Đêm', bSoccerGold:'Vàng',
    bBasketball:'Bóng rổ', bVolleyball:'Bóng chuyền', bBaseball:'Bóng chày',
    bVintage:'Cổ điển', bWC26:'WC26 Chính thức', bTrionda:'Trionda 2026',
    bPingpongW:'Bóng bàn (T)', bPingpongO:'Bóng bàn (C)',
    gBallBasketball:'🏋 Nặng', gBallVolleyball:'🪶 Nhẹ', gBallPingpong:'💨 Siêu nhẹ',
    gBallGold:'⭐ 1.2× Điểm', gBallTennis:'🎾 Nhẹ và nảy', gBallBaseball:'⚾ Nảy mạnh',
    gBallWC26:'🏆 +15% Điểm', gBallTrionda:'🌍 +20% Điểm',
    sStreet:'Phố', sStadium:'Sân vận động', sNight:'Đêm', sBeach:'Bãi biển', sSpace:'Vũ trụ',
    gStadStadium:'⚡ 1.5× Điểm', gStadNight:'🌙 Bóng chậm',
    gStadBeach:'↔ Sân rộng', gStadSpace:'🪐 Trọng lực thấp',
    itemEquipped:'✓ Đã trang bị', itemEquip:'Trang bị',
  },

  // ─── Thai ─────────────────────────────────────────────────────────────────────
  th: {
    tabShop:'ร้านค้า', tabRanks:'อันดับ', tabSettings:'ตั้งค่า',
    statBest:'ดีที่สุด', statLast:'ล่าสุด', statGames:'เกม',
    classicName:'คลาสสิก', classicDesc:'เล่นให้นานที่สุด',
    taName:'แข่งเวลา', taDesc:'เตะสูงสุดใน 30 วินาที',
    chName:'ความท้าทาย', chDesc:'ความสูงสูงสุดใน 30 วินาที',
    playBtn:'เล่น', coinLabel:'เหรียญ',
    lbEmpty:'ยังไม่มีคะแนน!',
    lbClassic:'คลาสสิก', lbTA:'แข่งเวลา', lbCH:'ความท้าทาย',
    goOver:'เกมโอเวอร์', goNew:'🏆 สถิติใหม่!',
    nameTitle:'🏆 สถิติใหม่!', nameSub:'ใส่ชื่อสำหรับกระดานผู้นำ',
    namePH:'ชื่อของคุณ (ภาษาอังกฤษ)...', nameSave:'บันทึก', nameSkip:'ข้าม',
    sSound:'เสียง', sSoundSub:'เสียงเตะและ UI',
    sHaptics:'การสั่น', sHapticsSub:'สั่นเมื่อเตะ',
    sParticles:'เอฟเฟกต์', sParticlesSub:'เอฟเฟกต์ภาพเมื่อเตะ',
    sSlowMo:'สโลว์โมชัน', sSlowMoSub:'รีเพลย์เมื่อลูกบอลตก',
    sMusic:'เพลง', sLang:'ภาษา', sLangSub:'เปลี่ยนภาษา',
    sVersion:'เวอร์ชัน', sPlaylist:'เพลย์ลิสต์', bgmSection:'เพลงพื้นหลัง',
    hint0:'ขยับเท้าเพื่อควบคุม', hint1:'รักษาลูกบอลไว้ในอากาศ!',
    hint2:'เหรียญ ลม และสิ่งกีดขวางกำลังมา!', hintOk:'เข้าใจแล้ว',
    charsTitle:'ผู้เล่น', equippedBtn:'✓ สวมอยู่', wearBtn:'สวม',
    annCoin:'🪙 เหรียญในอากาศ!', annWind:'🌬️ ลมเริ่มพัดแล้ว!', annObs:'⚠️ ระวังสิ่งกีดขวาง!',
    kicks:'เตะ', height:'ความสูง',
    bTennis:'เทนนิส', bSoccerClassic:'คลาสสิก', bSoccerFire:'ไฟ',
    bSoccerNight:'กลางคืน', bSoccerGold:'ทอง',
    bBasketball:'บาสเกตบอล', bVolleyball:'วอลเลย์บอล', bBaseball:'เบสบอล',
    bVintage:'วินเทจ', bWC26:'WC26 ทางการ', bTrionda:'ทริออนดา 2026',
    bPingpongW:'ปิงปอง (ขาว)', bPingpongO:'ปิงปอง (ส้ม)',
    gBallBasketball:'🏋 หนัก', gBallVolleyball:'🪶 เบา', gBallPingpong:'💨 เบาพิเศษ',
    gBallGold:'⭐ 1.2× คะแนน', gBallTennis:'🎾 เบาและเด้ง', gBallBaseball:'⚾ เด้งแรง',
    gBallWC26:'🏆 +15% คะแนน', gBallTrionda:'🌍 +20% คะแนน',
    sStreet:'ถนน', sStadium:'สนามกีฬา', sNight:'กลางคืน', sBeach:'ชายหาด', sSpace:'อวกาศ',
    gStadStadium:'⚡ 1.5× คะแนน', gStadNight:'🌙 ลูกบอลช้า',
    gStadBeach:'↔ สนามกว้าง', gStadSpace:'🪐 แรงโน้มถ่วงต่ำ',
    itemEquipped:'✓ สวมอยู่', itemEquip:'สวม',
  },
}

// ─── Supported languages & country→lang mapping ──────────────────────────────
const SUPPORTED_LANGS = ['en','ko','ja','zh','es','pt','vi','th']
const LANG_NAMES = {
  en:'English', ko:'한국어', ja:'日本語', zh:'中文',
  es:'Español', pt:'Português', vi:'Tiếng Việt', th:'ภาษาไทย',
}
const COUNTRY_LANG = {
  kr:'ko', jp:'ja',
  cn:'zh', tw:'zh', hk:'zh',
  in:'en',  // India → English (Hindi script renders poorly on mobile UI)
  vn:'vi',
  th:'th',
  // Spanish-speaking
  es:'es', mx:'es', ar:'es', co:'es', cl:'es', pe:'es', ve:'es',
  ec:'es', bo:'es', py:'es', uy:'es', cr:'es', pa:'es', hn:'es',
  gt:'es', sv:'es', cu:'es',
  // Portuguese-speaking
  pt:'pt', br:'pt',
}

let lang = store.get('j3d_lang', 'en')
function t(k) { return STRINGS[lang]?.[k] ?? STRINGS.en[k] ?? k }
window._t = k => t(k)

// ─── Player roster ────────────────────────────────────────────────────────────
export const PLAYERS = [
  // ── 현역 선수 ─────────────────────────────────────────────────────────────────
  { id:'son',      name:'SON',       full:'손흥민',
    country:'🇰🇷 South Korea', countryCode:'kr',
    colors:{shirt:0xc8102e,shorts:0x002395,skin:0xf0c090,hair:0x1a1008},
    hairStyle:'short', price:0,
    ability:{scoreMult:2, desc:'🏆 Classic 2× Score'} },
  { id:'chhetri',  name:'CHHETRI',   full:'Sunil Chhetri',
    country:'🇮🇳 India', countryCode:'in',
    colors:{shirt:0x0033a0,shorts:0xffffff,skin:0xb87040,hair:0x0a0806},
    hairStyle:'short', price:100,
    ability:{kickBonus:2.0, desc:'⬆️ +2 Kick Power (Challenge ↑)'} },
  { id:'quanghai', name:'QUANG HAI', full:'Nguyễn Quang Hải',
    country:'🇻🇳 Vietnam', countryCode:'vn',
    colors:{shirt:0xda251d,shorts:0xda251d,skin:0xd09060,hair:0x0a0806},
    hairStyle:'short', price:120,
    ability:{centerPull:0.20, desc:'🎯 Ball Drift Control (All Modes)'} },
  { id:'mitoma',   name:'MITOMA',    full:'三笘薫',
    country:'🇯🇵 Japan', countryCode:'jp',
    colors:{shirt:0x003f8a,shorts:0xffffff,skin:0xf0c090,hair:0x0d0a06},
    hairStyle:'medium', price:200,
    ability:{wallDamp:0.35, desc:'🎯 Soft Wall Bounce (Stability ↑)'} },
  { id:'pulisic',  name:'PULISIC',   full:'Christian Pulisic',
    country:'🇺🇸 USA', countryCode:'us',
    colors:{shirt:0xf0f2f8,shorts:0x002868,skin:0xfad4a0,hair:0x9a6a28},
    hairStyle:'short', price:450,
    ability:{ footSpeed:1.5, kickBonus:2.0, desc:'⚡🦅 Speed + Kick (Time Attack ↑)' } },
  { id:'davies',   name:'DAVIES',    full:'Alphonso Davies',
    country:'🇨🇦 Canada', countryCode:'ca',
    colors:{shirt:0xcc0000,shorts:0xffffff,skin:0x8a5020,hair:0x0a0806},
    hairStyle:'short', price:500,
    ability:{ footSpeed:2.2, desc:'⚡ Turbo ×2.2 (Time Attack ↑)' } },
  { id:'lozano',   name:'LOZANO',    full:'Hirving "Chucky" Lozano',
    country:'🇲🇽 Mexico', countryCode:'mx',
    colors:{shirt:0x006847,shorts:0xffffff,skin:0xd09050,hair:0x1a0e06},
    hairStyle:'short', price:400,
    ability:{ footSpeed:1.6, centerPull:0.22, desc:'🌶️ Speed + Control (Time Attack ↑)' } },
  { id:'wirtz',    name:'WIRTZ',     full:'Florian Wirtz',
    country:'🇩🇪 Germany', countryCode:'de',
    colors:{shirt:0xffffff,shorts:0x111111,skin:0xfad4a0,hair:0xbb8833},
    hairStyle:'short', price:350,
    ability:{footSpeed:1.4, scoreMult:1.3, desc:'⚡ Speed + 1.3× Score (TA/Classic ↑)'} },
  { id:'salah',    name:'SALAH',     full:'Mohamed Salah',
    country:'🇪🇬 Egypt', countryCode:'eg',
    colors:{shirt:0xcc0000,shorts:0xcc0000,skin:0xc08040,hair:0x050303},
    hairStyle:'curly', price:400,
    ability:{scoreMult:1.5, footSpeed:1.3, desc:'🏆 1.5× Score + Speed (Classic ↑)'} },
  { id:'vini',     name:'VINI JR',   full:'Vinícius Jr.',
    country:'🇧🇷 Brazil', countryCode:'br',
    colors:{shirt:0x009c3b,shorts:0x002776,skin:0xd09050,hair:0x1a0e06},
    hairStyle:'medium', price:650,
    ability:{centerPull:0.4, desc:'🧲 Ball Magnet (Challenge ↑)'} },
  { id:'cr7',      name:'CR7',       full:'Cristiano Ronaldo',
    country:'🇵🇹 Portugal', countryCode:'pt',
    colors:{shirt:0x006600,shorts:0xff0000,skin:0xf5c9a0,hair:0x1c0e06},
    hairStyle:'styled', price:1800,
    ability:{kickBonus:5, desc:'💥 +5 Kick Power (Challenge ↑)'} },
  { id:'messi',    name:'MESSI',     full:'Lionel Messi',
    country:'🇦🇷 Argentina', countryCode:'ar',
    colors:{shirt:0x74acdf,shorts:0x1a1a1a,skin:0xf0c080,hair:0x1c100a},
    hairStyle:'long', price:3500,
    ability:{ scoreMult:2, kickBonus:4, wallDamp:0.72,
              footScale:1.3, footSpeed:1.5, centerPull:0.35,
              desc:'👑 ALL Abilities MAX'} },
  // ── 은퇴 레전드 ───────────────────────────────────────────────────────────────
  { id:'robben',   name:'ROBBEN',    full:'Arjen Robben',
    country:'🇳🇱 Netherlands', countryCode:'nl',
    colors:{shirt:0xff6600,shorts:0xff6600,skin:0xfad4a0,hair:0xddbb66},
    hairStyle:'bald', price:500,
    ability:{footSpeed:1.6, desc:'⚡ Foot Speed ×1.6 (Time Attack ↑)'} },
  { id:'iniesta',  name:'INIESTA',   full:'Andrés Iniesta',
    country:'🇪🇸 Spain', countryCode:'es',
    colors:{shirt:0xc8102e,shorts:0x002395,skin:0xf0c080,hair:0x2a1a08},
    hairStyle:'short', price:600,
    ability:{footScale:1.2, centerPull:0.25, desc:'🎯 Precision Control (Challenge ↑)'} },
  { id:'delpiero', name:'DEL PIERO', full:'Alessandro Del Piero',
    country:'🇮🇹 Italy', countryCode:'it',
    colors:{shirt:0x003399,shorts:0x003399,skin:0xf0c080,hair:0x110a04},
    hairStyle:'short', price:700,
    ability:{kickBonus:2.5, footScale:1.15, desc:'⬆️ High Kick Master (Challenge ↑)'} },
  { id:'modric',   name:'MODRIC',    full:'Luka Modrić',
    country:'🇭🇷 Croatia', countryCode:'hr',
    colors:{shirt:0xff2020,shorts:0xffffff,skin:0xf5c9a0,hair:0xddcc88},
    hairStyle:'undercut', price:800,
    ability:{wallDamp:0.85, desc:'🔮 Strong Wall Recovery (wall hits bounce back)'} },
  { id:'zidane',   name:'ZIDANE',    full:'Zinedine Zidane',
    country:'🇫🇷 France', countryCode:'fr',
    colors:{shirt:0x002395,shorts:0xffffff,skin:0xe8c49a,hair:0x111111},
    hairStyle:'bald', price:1000,
    ability:{footScale:1.4, desc:'🌀 Wide Foot ×1.4 (All Modes ↑)'} },
]

// ─── Ad-unlock roster ─────────────────────────────────────────────────────────
const AD_UNLOCK = {
  robben: { adsRequired: 1 },
  modric: { adsRequired: 2 },
}
function adProgress(id) { return store.get(`j3d_adprog_${id}`, 0) }

// ─── Ball roster ──────────────────────────────────────────────────────────────
export const BALLS = [
  // ── 축구공 (diameter 22 cm → radiusMult 1.0 base) ──────────────────────────
  { id:'soccer_classic', nameKey:'bSoccerClassic', emoji:'⚽', style:'soccer',
    meshStyle:'obj_soccer',
    base:0xffffff, patch:0x111111, price:0,   radiusMult:1.00, gimmick:null },
  // ── 테니스공 (diameter 6.7 cm → radiusMult 0.305) — 브라질 슬롯 대체 ────────
  { id:'tennis', nameKey:'bTennis', emoji:'🎾', style:'pingpong',
    meshStyle:'obj_tennis',
    base:0xc6d822, patch:0xf0f0f0, price:300, radiusMult:0.305,
    gimmick:{ gravityMult:0.82, wallBounce:1.55, descKey:'gBallTennis' } },
  { id:'soccer_fire',    nameKey:'bSoccerFire',    emoji:'🔴', style:'soccer',
    base:0xee2211, patch:0xff8800, price:400, radiusMult:1.00, gimmick:null },
  { id:'soccer_night',   nameKey:'bSoccerNight',   emoji:'🌑', style:'soccer',
    base:0x0d0d2e, patch:0x4499ff, price:450, radiusMult:1.00, gimmick:null },
  { id:'soccer_gold',    nameKey:'bSoccerGold',    emoji:'🏆', style:'soccer',
    base:0xffd700, patch:0x885500, price:600, radiusMult:1.00,
    gimmick:{ scoreMult:1.2, descKey:'gBallGold' } },
  // ── WC 2026 한정 공 ────────────────────────────────────────────────────────
  { id:'wc26',           nameKey:'bWC26',          emoji:'🌍', style:'soccer',
    meshStyle:'obj_trionda',
    base:0x0d1b4e, patch:0xffc800, price:550, radiusMult:1.00,
    gimmick:{ scoreMult:1.15, descKey:'gBallWC26' } },
  // ── FIFA TRIONDA 2026 공인구 (GLB 실제 모델) ───────────────────────────────
  { id:'trionda',        nameKey:'bTrionda',        emoji:'🏆', style:'soccer',
    meshStyle:'obj_trionda',
    base:0xffffff, patch:0x111111, price:800, radiusMult:1.00,
    gimmick:{ scoreMult:1.20, descKey:'gBallTrionda' } },
  // ── 농구공 (diameter 24 cm → radiusMult 1.09) ──────────────────────────────
  { id:'basketball', nameKey:'bBasketball', emoji:'🏀', style:'basketball',
    meshStyle:'obj_basketball',
    base:0xe05c10, patch:0x4a1e00, price:350, radiusMult:1.09,
    gimmick:{ gravityMult:1.18, descKey:'gBallBasketball' } },
  // ── 배구공 (diameter 21 cm → radiusMult 0.955) ─────────────────────────────
  { id:'volleyball', nameKey:'bVolleyball', emoji:'🏐', style:'volleyball',
    meshStyle:'obj_volleyball',
    base:0xf0f0f0, patch:0x4488ee, price:250, radiusMult:0.955,
    gimmick:{ gravityMult:0.82, descKey:'gBallVolleyball' } },
  // ── 야구공 (diameter 7.3 cm → radiusMult 0.332) ────────────────────────────
  { id:'baseball', nameKey:'bBaseball', emoji:'⚾', style:'baseball',
    meshStyle:'obj_baseball',
    base:0xf5f0e8, patch:0xcc2222, price:200, radiusMult:0.332,
    gimmick:{ wallBounce:1.35, descKey:'gBallBaseball' } },
  // ── 빈티지 공 ──────────────────────────────────────────────────────────────
  { id:'vintage', nameKey:'bVintage', emoji:'🟤', style:'pingpong',
    meshStyle:'obj_vintage',
    base:0x7a4a20, patch:0x7a4a20, price:400, radiusMult:1.00, gimmick:null },
  // ── 탁구공 (diameter 4 cm → radiusMult 0.182) ──────────────────────────────
  { id:'pingpong_white',  nameKey:'bPingpongW', emoji:'🏓', style:'pingpong',
    base:0xf0f0f0, patch:0xf0f0f0, price:150, radiusMult:0.182,
    gimmick:{ gravityMult:0.55, descKey:'gBallPingpong' } },
  { id:'pingpong_orange', nameKey:'bPingpongO', emoji:'🟠', style:'pingpong',
    base:0xff5500, patch:0xff5500, price:150, radiusMult:0.182,
    gimmick:{ gravityMult:0.55, descKey:'gBallPingpong' } },
]

// ─── Stadium roster ───────────────────────────────────────────────────────────
export const STADIUMS = [
  { id:'street',  nameKey:'sStreet',  emoji:'🏙', price:0,
    bg:0x7ab2d0, fog:0x7ab2d0, ground:0x9aaa88, pave:0xc4b89a,
    ambient:0xffeedd, sun:0xfff8e0, gimmick:null },
  { id:'stadium', nameKey:'sStadium', emoji:'🏟', price:400,
    bg:0x8ecae6, fog:0x8ecae6, ground:0x2d6a4f, pave:0x40916c,
    ambient:0xddeeff, sun:0xffffff,
    gimmick:{ scoreMult:1.5, descKey:'gStadStadium' } },
  { id:'night',   nameKey:'sNight',   emoji:'🌙', price:600,
    bg:0x071526, fog:0x071526, ground:0x0f2418, pave:0x163020,
    ambient:0x334466, sun:0x8899ff,
    gimmick:{ gravityMult:0.72, descKey:'gStadNight' } },
  { id:'beach',   nameKey:'sBeach',   emoji:'🏖', price:350,
    bg:0x0096c7, fog:0x48cae4, ground:0xede0ab, pave:0xf5d998,
    ambient:0xfff0cc, sun:0xffeecc,
    gimmick:{ wallScale:1.35, descKey:'gStadBeach' } },
  { id:'space',   nameKey:'sSpace',   emoji:'🚀', price:800,
    bg:0x020008, fog:0x020008, ground:0x1a0030, pave:0x2d0050,
    ambient:0x112244, sun:0x6688ff,
    gimmick:{ gravityMult:0.42, descKey:'gStadSpace' } },
]

// ─── Admin mode (URL: ?admin=j3d2026) ────────────────────────────────────────
const _ADMIN_SECRET = 'j3d2026'
const _isAdmin = new URLSearchParams(location.search).get('admin') === _ADMIN_SECRET
const _HIST_KEYS = { classic:'j3d_history', timeattack:'j3d_ta_history', challenge:'j3d_ch_history' }

window._adminDel = function(mode, score, name) {
  const key = _HIST_KEYS[mode]
  if (!key) return
  const before = store.get(key, [])
  let removed = false
  const after = before.filter(e => {
    if (!removed && (e.name||'Player') === name && e.score === score) { removed = true; return false }
    return true
  })
  if (!removed) { _adminToast(`⚠️ Not found: ${name} / ${score}`); return }
  store.set(key, after)
  _adminToast(`🗑 Deleted: ${name} (${score})`)
  refreshLeaderboard()
  renderSidePanels()
}

function _adminToast(msg) {
  let el = document.getElementById('admin-toast')
  if (!el) {
    el = document.createElement('div')
    el.id = 'admin-toast'
    el.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);background:#1a2a1a;color:#6f6;border:1px solid #3f3;border-radius:10px;padding:8px 18px;font-size:13px;font-weight:700;z-index:9999;pointer-events:none;transition:opacity .4s'
    document.body.appendChild(el)
  }
  el.textContent = msg
  el.style.opacity = '1'
  clearTimeout(el._t)
  el._t = setTimeout(() => { el.style.opacity = '0' }, 2500)
}

// ─── State ────────────────────────────────────────────────────────────────────
let coins         = store.get('j3d_coins', 0)
let owned         = store.get('j3d_owned', ['son']).map(id => id === 'kaka' ? 'vini' : id)
let equipped      = (() => { const s = store.get('j3d_equipped', 'son'); return s === 'kaka' ? 'vini' : s })()
let ownedBalls    = store.get('j3d_owned_balls', ['soccer_classic'])
  // migrate old save: replace obsolete 'classic' id
  .map(id => id === 'classic' ? 'soccer_classic' : id)
  .filter(id => BALLS.some(b => b.id === id) || id === 'soccer_classic')
let equippedBall  = (() => {
  const saved = store.get('j3d_equipped_ball', 'soccer_classic')
  const migrated = saved === 'classic' ? 'soccer_classic' : saved
  return BALLS.some(b => b.id === migrated) ? migrated : 'soccer_classic'
})()
let prevBall      = equippedBall
let ownedStads    = store.get('j3d_owned_stads', ['street'])
let equippedStad  = store.get('j3d_equipped_stad', 'street')
let prevStad      = equippedStad
let previewing    = null
let shopSubTab    = 'players'
let best          = store.get('j3d_best', 0)
let games         = store.get('j3d_games', 0)
let lastScore     = store.get('j3d_last', null)
let settings      = store.get('j3d_settings', {sound:true, haptics:true, particles:true, slowMo:true, sfxVol:80, bgmVol:70})
// Fill in defaults for keys added after first save
if (settings.sfxVol == null) settings.sfxVol = 80
if (settings.bgmVol == null) settings.bgmVol = 70
// ─── WC 2026 Tournament ───────────────────────────────────────────────────────
const NATIONS = [
  // ── South & Southeast Asia (잠재 고객 우선) ───────────────────────────────
  { code:'in', flag:'🇮🇳', name:'India',          nameKo:'인도' },
  { code:'vn', flag:'🇻🇳', name:'Vietnam',        nameKo:'베트남' },
  { code:'th', flag:'🇹🇭', name:'Thailand',       nameKo:'태국' },
  { code:'ph', flag:'🇵🇭', name:'Philippines',    nameKo:'필리핀' },
  { code:'my', flag:'🇲🇾', name:'Malaysia',       nameKo:'말레이시아' },
  { code:'sg', flag:'🇸🇬', name:'Singapore',      nameKo:'싱가포르' },
  { code:'id', flag:'🇮🇩', name:'Indonesia',      nameKo:'인도네시아' },
  { code:'mm', flag:'🇲🇲', name:'Myanmar',        nameKo:'미얀마' },
  { code:'kh', flag:'🇰🇭', name:'Cambodia',       nameKo:'캄보디아' },
  { code:'pk', flag:'🇵🇰', name:'Pakistan',       nameKo:'파키스탄' },
  { code:'bd', flag:'🇧🇩', name:'Bangladesh',     nameKo:'방글라데시' },
  { code:'lk', flag:'🇱🇰', name:'Sri Lanka',      nameKo:'스리랑카' },
  { code:'np', flag:'🇳🇵', name:'Nepal',          nameKo:'네팔' },
  // ── East Asia ─────────────────────────────────────────────────────────────
  { code:'kr', flag:'🇰🇷', name:'South Korea',    nameKo:'대한민국' },
  { code:'jp', flag:'🇯🇵', name:'Japan',          nameKo:'일본' },
  { code:'cn', flag:'🇨🇳', name:'China',          nameKo:'중국' },
  { code:'tw', flag:'🇹🇼', name:'Taiwan',         nameKo:'대만' },
  { code:'hk', flag:'🇭🇰', name:'Hong Kong',      nameKo:'홍콩' },
  { code:'mn', flag:'🇲🇳', name:'Mongolia',       nameKo:'몽골' },
  // ── Middle East ───────────────────────────────────────────────────────────
  { code:'sa', flag:'🇸🇦', name:'Saudi Arabia',   nameKo:'사우디' },
  { code:'ir', flag:'🇮🇷', name:'Iran',           nameKo:'이란' },
  { code:'iq', flag:'🇮🇶', name:'Iraq',           nameKo:'이라크' },
  { code:'ae', flag:'🇦🇪', name:'UAE',            nameKo:'UAE' },
  { code:'jo', flag:'🇯🇴', name:'Jordan',         nameKo:'요르단' },
  { code:'qa', flag:'🇶🇦', name:'Qatar',          nameKo:'카타르' },
  { code:'kw', flag:'🇰🇼', name:'Kuwait',         nameKo:'쿠웨이트' },
  { code:'bh', flag:'🇧🇭', name:'Bahrain',        nameKo:'바레인' },
  { code:'om', flag:'🇴🇲', name:'Oman',           nameKo:'오만' },
  { code:'lb', flag:'🇱🇧', name:'Lebanon',        nameKo:'레바논' },
  { code:'il', flag:'🇮🇱', name:'Israel',         nameKo:'이스라엘' },
  // ── Central Asia ──────────────────────────────────────────────────────────
  { code:'kz', flag:'🇰🇿', name:'Kazakhstan',     nameKo:'카자흐스탄' },
  { code:'uz', flag:'🇺🇿', name:'Uzbekistan',     nameKo:'우즈베키스탄' },
  // ── Oceania ───────────────────────────────────────────────────────────────
  { code:'au', flag:'🇦🇺', name:'Australia',      nameKo:'호주' },
  { code:'nz', flag:'🇳🇿', name:'New Zealand',    nameKo:'뉴질랜드' },
  { code:'fj', flag:'🇫🇯', name:'Fiji',           nameKo:'피지' },
  // ── South America ─────────────────────────────────────────────────────────
  { code:'br', flag:'🇧🇷', name:'Brazil',         nameKo:'브라질' },
  { code:'ar', flag:'🇦🇷', name:'Argentina',      nameKo:'아르헨티나' },
  { code:'co', flag:'🇨🇴', name:'Colombia',       nameKo:'콜롬비아' },
  { code:'uy', flag:'🇺🇾', name:'Uruguay',        nameKo:'우루과이' },
  { code:'ec', flag:'🇪🇨', name:'Ecuador',        nameKo:'에콰도르' },
  { code:'cl', flag:'🇨🇱', name:'Chile',          nameKo:'칠레' },
  { code:'pe', flag:'🇵🇪', name:'Peru',           nameKo:'페루' },
  { code:'ve', flag:'🇻🇪', name:'Venezuela',      nameKo:'베네수엘라' },
  { code:'py', flag:'🇵🇾', name:'Paraguay',       nameKo:'파라과이' },
  { code:'bo', flag:'🇧🇴', name:'Bolivia',        nameKo:'볼리비아' },
  // ── North & Central America ───────────────────────────────────────────────
  { code:'us', flag:'🇺🇸', name:'USA',            nameKo:'미국' },
  { code:'mx', flag:'🇲🇽', name:'Mexico',         nameKo:'멕시코' },
  { code:'ca', flag:'🇨🇦', name:'Canada',         nameKo:'캐나다' },
  { code:'cr', flag:'🇨🇷', name:'Costa Rica',     nameKo:'코스타리카' },
  { code:'pa', flag:'🇵🇦', name:'Panama',         nameKo:'파나마' },
  { code:'hn', flag:'🇭🇳', name:'Honduras',       nameKo:'온두라스' },
  { code:'jm', flag:'🇯🇲', name:'Jamaica',        nameKo:'자메이카' },
  { code:'gt', flag:'🇬🇹', name:'Guatemala',      nameKo:'과테말라' },
  { code:'sv', flag:'🇸🇻', name:'El Salvador',    nameKo:'엘살바도르' },
  { code:'cu', flag:'🇨🇺', name:'Cuba',           nameKo:'쿠바' },
  { code:'tt', flag:'🇹🇹', name:'Trinidad & Tobago', nameKo:'트리니다드' },
  // ── Western Europe ────────────────────────────────────────────────────────
  { code:'de', flag:'🇩🇪', name:'Germany',        nameKo:'독일' },
  { code:'es', flag:'🇪🇸', name:'Spain',          nameKo:'스페인' },
  { code:'fr', flag:'🇫🇷', name:'France',         nameKo:'프랑스' },
  { code:'en', flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', name:'England',       nameKo:'잉글랜드' },
  { code:'pt', flag:'🇵🇹', name:'Portugal',       nameKo:'포르투갈' },
  { code:'nl', flag:'🇳🇱', name:'Netherlands',    nameKo:'네덜란드' },
  { code:'be', flag:'🇧🇪', name:'Belgium',        nameKo:'벨기에' },
  { code:'it', flag:'🇮🇹', name:'Italy',          nameKo:'이탈리아' },
  { code:'ch', flag:'🇨🇭', name:'Switzerland',    nameKo:'스위스' },
  { code:'at', flag:'🇦🇹', name:'Austria',        nameKo:'오스트리아' },
  { code:'gb', flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿', name:'Scotland',      nameKo:'스코틀랜드' },
  { code:'ie', flag:'🇮🇪', name:'Ireland',        nameKo:'아일랜드' },
  { code:'se', flag:'🇸🇪', name:'Sweden',         nameKo:'스웨덴' },
  { code:'no', flag:'🇳🇴', name:'Norway',         nameKo:'노르웨이' },
  { code:'dk', flag:'🇩🇰', name:'Denmark',        nameKo:'덴마크' },
  { code:'fi', flag:'🇫🇮', name:'Finland',        nameKo:'핀란드' },
  { code:'is', flag:'🇮🇸', name:'Iceland',        nameKo:'아이슬란드' },
  // ── Eastern Europe ────────────────────────────────────────────────────────
  { code:'hr', flag:'🇭🇷', name:'Croatia',        nameKo:'크로아티아' },
  { code:'rs', flag:'🇷🇸', name:'Serbia',         nameKo:'세르비아' },
  { code:'pl', flag:'🇵🇱', name:'Poland',         nameKo:'폴란드' },
  { code:'ua', flag:'🇺🇦', name:'Ukraine',        nameKo:'우크라이나' },
  { code:'cz', flag:'🇨🇿', name:'Czech Republic', nameKo:'체코' },
  { code:'ro', flag:'🇷🇴', name:'Romania',        nameKo:'루마니아' },
  { code:'hu', flag:'🇭🇺', name:'Hungary',        nameKo:'헝가리' },
  { code:'sk', flag:'🇸🇰', name:'Slovakia',       nameKo:'슬로바키아' },
  { code:'bg', flag:'🇧🇬', name:'Bulgaria',       nameKo:'불가리아' },
  { code:'gr', flag:'🇬🇷', name:'Greece',         nameKo:'그리스' },
  { code:'tr', flag:'🇹🇷', name:'Turkey',         nameKo:'터키' },
  { code:'si', flag:'🇸🇮', name:'Slovenia',       nameKo:'슬로베니아' },
  { code:'al', flag:'🇦🇱', name:'Albania',        nameKo:'알바니아' },
  { code:'ge', flag:'🇬🇪', name:'Georgia',        nameKo:'조지아' },
  { code:'rs', flag:'🇷🇸', name:'Serbia',         nameKo:'세르비아' },
  { code:'ba', flag:'🇧🇦', name:'Bosnia',         nameKo:'보스니아' },
  { code:'mk', flag:'🇲🇰', name:'North Macedonia',nameKo:'북마케도니아' },
  { code:'ru', flag:'🇷🇺', name:'Russia',         nameKo:'러시아' },
  { code:'lt', flag:'🇱🇹', name:'Lithuania',      nameKo:'리투아니아' },
  { code:'lv', flag:'🇱🇻', name:'Latvia',         nameKo:'라트비아' },
  { code:'ee', flag:'🇪🇪', name:'Estonia',        nameKo:'에스토니아' },
  // ── Africa ────────────────────────────────────────────────────────────────
  { code:'ma', flag:'🇲🇦', name:'Morocco',        nameKo:'모로코' },
  { code:'eg', flag:'🇪🇬', name:'Egypt',          nameKo:'이집트' },
  { code:'ng', flag:'🇳🇬', name:'Nigeria',        nameKo:'나이지리아' },
  { code:'sn', flag:'🇸🇳', name:'Senegal',        nameKo:'세네갈' },
  { code:'gh', flag:'🇬🇭', name:'Ghana',          nameKo:'가나' },
  { code:'ci', flag:'🇨🇮', name:"Ivory Coast",    nameKo:'코트디부아르' },
  { code:'cm', flag:'🇨🇲', name:'Cameroon',       nameKo:'카메룬' },
  { code:'za', flag:'🇿🇦', name:'South Africa',   nameKo:'남아공' },
  { code:'tn', flag:'🇹🇳', name:'Tunisia',        nameKo:'튀니지' },
  { code:'ml', flag:'🇲🇱', name:'Mali',           nameKo:'말리' },
  { code:'cd', flag:'🇨🇩', name:'DR Congo',       nameKo:'콩고' },
  { code:'dz', flag:'🇩🇿', name:'Algeria',        nameKo:'알제리' },
  { code:'et', flag:'🇪🇹', name:'Ethiopia',       nameKo:'에티오피아' },
  { code:'ke', flag:'🇰🇪', name:'Kenya',          nameKo:'케냐' },
  { code:'tz', flag:'🇹🇿', name:'Tanzania',       nameKo:'탄자니아' },
  { code:'ug', flag:'🇺🇬', name:'Uganda',         nameKo:'우간다' },
  { code:'ao', flag:'🇦🇴', name:'Angola',         nameKo:'앙골라' },
  { code:'mz', flag:'🇲🇿', name:'Mozambique',     nameKo:'모잠비크' },
  { code:'zm', flag:'🇿🇲', name:'Zambia',         nameKo:'잠비아' },
  { code:'zw', flag:'🇿🇼', name:'Zimbabwe',       nameKo:'짐바브웨' },
]

const WC_ROUNDS = [
  { id:'group1', label:'Group Stage 1', labelKo:'조별 1경기', emoji:'🌍', target:12 },
  { id:'group2', label:'Group Stage 2', labelKo:'조별 2경기', emoji:'🌍', target:18 },
  { id:'group3', label:'Group Stage 3', labelKo:'조별 3경기', emoji:'🌍', target:24 },
  { id:'r16',    label:'Round of 16',   labelKo:'16강',       emoji:'⚔️',  target:32 },
  { id:'qf',     label:'Quarter Final', labelKo:'8강',        emoji:'🔥',  target:42 },
  { id:'sf',     label:'Semi Final',    labelKo:'4강',        emoji:'💥',  target:55 },
  { id:'final',  label:'Final',         labelKo:'결승',        emoji:'🏆',  target:70 },
]
const RANK_EMOJIS = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟']

let wcRound   = store.get('j3d_wc_round', 0)     // 0–6 = current round index; 7 = champion
let wcCountry = store.get('j3d_wc_country', null) // selected nation code or null
let userId    = store.get('j3d_user_id',   null)  // player nickname, up to 8 chars

function wcCurrentRound() { return WC_ROUNDS[wcRound] ?? null }
function wcIsChampion()   { return wcRound >= WC_ROUNDS.length }

function renderWCCard() {
  const iconEl    = document.getElementById('wc-card-icon')
  const descEl    = document.getElementById('wc-card-desc')
  const dotsEl    = document.getElementById('wc-card-dots')
  const countryEl = document.getElementById('wc-card-country')
  if (!descEl || !dotsEl) return

  if (wcIsChampion()) {
    if (iconEl) iconEl.textContent = '🏆'
    descEl.textContent = lang === 'ko' ? '월드컵 우승! 🎉' : 'World Champion! 🎉'
    dotsEl.innerHTML = '<span class="wc-champion-badge">CHAMPION</span>'
  } else {
    const r = wcCurrentRound()
    if (iconEl) iconEl.textContent = r.emoji
    const lbl = lang === 'ko' ? r.labelKo : r.label
    descEl.textContent = `${lbl} · ${r.target} kicks`
    dotsEl.innerHTML = WC_ROUNDS.map((_, i) => {
      const cls = i < wcRound ? 'wc-dot done' : i === wcRound ? 'wc-dot current' : 'wc-dot'
      return `<div class="${cls}"></div>`
    }).join('')
  }

  if (countryEl) {
    const n = NATIONS.find(x => x.code === wcCountry)
    if (n) {
      countryEl.textContent = `${n.flag} ${lang === 'ko' ? n.nameKo : n.name}`
      countryEl.style.display = 'block'
    } else {
      countryEl.style.display = 'none'
    }
  }
}

// ─── Country picker ───────────────────────────────────────────────────────────
let _cpickerCallback = null

function renderCountryList(query = '') {
  const listEl = document.getElementById('country-list')
  if (!listEl) return
  const q = query.trim().toLowerCase()
  const filtered = q
    ? NATIONS.filter(n =>
        n.name.toLowerCase().includes(q) ||
        n.nameKo.includes(q) ||
        n.code.includes(q))
    : NATIONS

  // Put selected country at top if no query
  let sorted = filtered
  if (!q && wcCountry) {
    const sel = sorted.find(n => n.code === wcCountry)
    if (sel) sorted = [sel, ...sorted.filter(n => n.code !== wcCountry)]
  }

  listEl.innerHTML = sorted.map(n => {
    const displayName = lang === 'ko' ? n.nameKo : n.name
    const isSelected = n.code === wcCountry
    return `<div class="cpicker-item${isSelected ? ' selected' : ''}" data-code="${n.code}">
      <span class="cpicker-flag">${n.flag}</span>
      <span class="cpicker-name">${displayName}</span>
      ${isSelected ? '<span class="cpicker-check">✓</span>' : ''}
    </div>`
  }).join('')

  listEl.querySelectorAll('.cpicker-item').forEach(item => {
    item.addEventListener('click', () => {
      const code = item.dataset.code
      wcCountry = code
      store.set('j3d_wc_country', code)
      // Auto-set language from country
      const autoLang = COUNTRY_LANG[code] || 'en'
      if (autoLang !== lang) {
        lang = autoLang
        store.set('j3d_lang', lang)
        applyLang()   // re-render UI in new language immediately
      }
      _pickerMandatory = false
      closeCountryPicker()
      renderWCCard()
      if (_cpickerCallback) { _cpickerCallback(code); _cpickerCallback = null }
    })
  })
}

let _pickerMandatory = false   // true = first-launch, cannot dismiss without selecting

function openCountryPicker(onSelect, { mandatory = false, showWarning = false } = {}) {
  _cpickerCallback = onSelect || null
  _pickerMandatory = mandatory
  const el = document.getElementById('country-picker')
  if (!el) return
  const searchEl    = document.getElementById('country-search')
  const warningEl   = document.getElementById('cpicker-warning')
  const closeBtn    = document.getElementById('cpicker-close')

  if (searchEl) searchEl.value = ''
  if (warningEl) warningEl.style.display = showWarning ? 'flex' : 'none'
  if (closeBtn)  closeBtn.style.display  = mandatory   ? 'none' : 'block'

  renderCountryList('')
  el.classList.remove('hidden')
  requestAnimationFrame(() => {
    el.classList.add('visible')
    setTimeout(() => searchEl?.focus(), 350)
  })
}

function closeCountryPicker() {
  if (_pickerMandatory) return   // must select a country first
  const el = document.getElementById('country-picker')
  if (!el) return
  el.classList.remove('visible')
  setTimeout(() => el.classList.add('hidden'), 300)
}

// ─── Change country (with warning & WC reset) ─────────────────────────────────
function changeCountry() {
  const warningNeeded = wcRound > 0
  // Update warning text with current round info
  const warnEl = document.getElementById('cpicker-warning-text')
  if (warnEl) {
    warnEl.textContent = lang === 'ko'
      ? `국가 변경 시 WC 진행 기록 (${wcRound}라운드)이 초기화됩니다`
      : `Changing country resets your WC progress (Round ${wcRound})`
  }
  openCountryPicker(() => {
    wcRound = 0
    store.set('j3d_wc_round', 0)
    renderWCCard()
    renderCountrySettingRow()
  }, { mandatory: false, showWarning: warningNeeded })
}

function renderCountrySettingRow() {
  const el = document.getElementById('setting-country-val')
  if (!el) return
  const n = NATIONS.find(x => x.code === wcCountry)
  el.textContent = n ? `${n.flag} ${lang==='ko' ? n.nameKo : n.name}` : (lang==='ko' ? '미선택' : 'Not set')
}

// Search input wiring (done once on load)
document.getElementById('country-search')?.addEventListener('input', e => {
  renderCountryList(e.target.value)
})

// Backdrop tap — only closes if not mandatory
document.getElementById('country-picker')?.addEventListener('click', e => {
  if (e.target.id === 'country-picker') closeCountryPicker()
})

// Close button
document.getElementById('cpicker-close')?.addEventListener('click', closeCountryPicker)

// Expose for Settings row inline onclick
window._changeCountry = changeCountry

// ─── User ID modal ────────────────────────────────────────────────────────────
let _uidCallback  = null
let _uidMandatory = false

function openUserIdModal(onComplete, { mandatory = false, isEdit = false } = {}) {
  _uidCallback  = onComplete || null
  _uidMandatory = mandatory
  const el      = document.getElementById('user-id-modal')
  const input   = document.getElementById('uid-input')
  const errEl   = document.getElementById('uid-err')
  const titleEl = document.getElementById('uid-modal-title-text')
  const subEl   = document.getElementById('uid-modal-sub-text')
  if (!el) return

  // Dynamic title / subtitle — full 9-lang support
  const UID_STRINGS = {
    en: {
      welcomeTitle:  'Welcome to Juggle 3D!',
      welcomeSub:    'Create your player ID to appear<br>on the WC leaderboard',
      changeTitle:   'Change Player ID',
      setSub:        'Set your ID for the WC leaderboard',
      changeSubOld:  (id) => `Old ID "<b>${id}</b>" stays on past records.<br>New scores will use the new ID.`,
    },
    ko: {
      welcomeTitle:  'Juggle 3D에 오신 걸 환영합니다!',
      welcomeSub:    'WC 리더보드에 표시될<br>플레이어 ID를 만드세요',
      changeTitle:   '플레이어 ID 변경',
      setSub:        'WC 리더보드용 ID를 설정하세요',
      changeSubOld:  (id) => `기존 ID "<b>${id}</b>"는 과거 기록에 유지됩니다.<br>새 기록부터 새 ID가 적용됩니다.`,
    },
    ja: {
      welcomeTitle:  'Juggle 3D へようこそ！',
      welcomeSub:    'WCリーダーボードに表示される<br>プレイヤーIDを作成してください',
      changeTitle:   'プレイヤーIDを変更',
      setSub:        'WCリーダーボード用のIDを設定',
      changeSubOld:  (id) => `旧ID "<b>${id}</b>"は過去の記録に残ります。<br>新しい記録から新IDが使われます。`,
    },
    zh: {
      welcomeTitle:  '欢迎来到 Juggle 3D！',
      welcomeSub:    '创建你的玩家ID<br>在WC排行榜上亮相',
      changeTitle:   '更改玩家ID',
      setSub:        '为WC排行榜设置你的ID',
      changeSubOld:  (id) => `旧ID "<b>${id}</b>" 将保留在过去记录中。<br>新成绩将使用新ID。`,
    },
    es: {
      welcomeTitle:  '¡Bienvenido a Juggle 3D!',
      welcomeSub:    'Crea tu ID de jugador para aparecer<br>en el marcador WC',
      changeTitle:   'Cambiar ID de jugador',
      setSub:        'Establece tu ID para el marcador WC',
      changeSubOld:  (id) => `El ID antiguo "<b>${id}</b>" permanece en récords pasados.<br>Las nuevas puntuaciones usarán el nuevo ID.`,
    },
    pt: {
      welcomeTitle:  'Bem-vindo ao Juggle 3D!',
      welcomeSub:    'Crie seu ID de jogador para aparecer<br>no placar WC',
      changeTitle:   'Alterar ID do jogador',
      setSub:        'Defina seu ID para o placar WC',
      changeSubOld:  (id) => `O ID antigo "<b>${id}</b>" fica nos recordes passados.<br>Novas pontuações usarão o novo ID.`,
    },
    hi: {
      welcomeTitle:  'Juggle 3D में आपका स्वागत है!',
      welcomeSub:    'WC लीडरबोर्ड पर दिखने के लिए<br>अपना प्लेयर ID बनाएं',
      changeTitle:   'प्लेयर ID बदलें',
      setSub:        'WC लीडरबोर्ड के लिए ID सेट करें',
      changeSubOld:  (id) => `पुराना ID "<b>${id}</b>" पुराने रिकॉर्ड में रहेगा।<br>नए स्कोर नए ID से दर्ज होंगे।`,
    },
    vi: {
      welcomeTitle:  'Chào mừng đến Juggle 3D!',
      welcomeSub:    'Tạo ID người chơi để xuất hiện<br>trên bảng xếp hạng WC',
      changeTitle:   'Đổi ID người chơi',
      setSub:        'Đặt ID cho bảng xếp hạng WC',
      changeSubOld:  (id) => `ID cũ "<b>${id}</b>" vẫn giữ trong hồ sơ cũ.<br>Điểm mới sẽ dùng ID mới.`,
    },
    th: {
      welcomeTitle:  'ยินดีต้อนรับสู่ Juggle 3D!',
      welcomeSub:    'สร้าง ID ผู้เล่นเพื่อแสดง<br>บนลีดเดอร์บอร์ด WC',
      changeTitle:   'เปลี่ยน ID ผู้เล่น',
      setSub:        'ตั้งค่า ID สำหรับลีดเดอร์บอร์ด WC',
      changeSubOld:  (id) => `ID เก่า "<b>${id}</b>" ยังคงอยู่ในบันทึกเก่า<br>คะแนนใหม่จะใช้ ID ใหม่`,
    },
  }
  const us = UID_STRINGS[lang] || UID_STRINGS.en
  if (isEdit) {
    if (titleEl) titleEl.textContent = us.changeTitle
    if (subEl) subEl.innerHTML = userId
      ? us.changeSubOld(userId)
      : (us.setSub || UID_STRINGS.en.setSub)
  } else {
    if (titleEl) titleEl.textContent = us.welcomeTitle
    if (subEl)   subEl.innerHTML = us.welcomeSub
  }

  if (input) input.value = userId || ''
  if (errEl) errEl.textContent = ''
  el.classList.remove('hidden')
  requestAnimationFrame(() => {
    el.classList.add('visible')
    setTimeout(() => input?.focus(), 350)
  })
}

function closeUserIdModal() {
  const el = document.getElementById('user-id-modal')
  if (!el) return
  el.classList.remove('visible')
  setTimeout(() => el.classList.add('hidden'), 320)
}

// Common profanity blocklist (case-insensitive substring match)
const PROFANITY = ['sex','xxx','ass','fuck','shit','cock','dick','porn','nude','cum','bitch','cunt','nigger','nigga','faggot','damn','hell','piss','crap','slut','whore','jerk','bastard','pussy','boob','tits']

function submitUserId() {
  const input = document.getElementById('uid-input')
  const errEl = document.getElementById('uid-err')
  if (!input) return
  const raw = input.value.trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)
  if (!raw) {
    const UID_ERR = { ko:'아이디를 입력하세요', ja:'IDを入力してください', zh:'请输入ID', es:'Ingresa un ID', pt:'Digite um ID', hi:'ID दर्ज करें', vi:'Nhập ID của bạn', th:'กรุณาใส่ ID' }
    if (errEl) errEl.textContent = UID_ERR[lang] || 'Please enter a player ID'
    input.focus()
    return
  }
  // Profanity check
  const lower = raw.toLowerCase()
  if (PROFANITY.some(w => lower.includes(w))) {
    const PROF_ERR = { ko:'사용할 수 없는 단어입니다', ja:'使用できない単語です', zh:'该词语不可使用', es:'Palabra no permitida', pt:'Palavra não permitida', hi:'यह शब्द उपयोग नहीं किया जा सकता', vi:'Từ này không được phép', th:'คำนี้ไม่อนุญาต' }
    if (errEl) errEl.textContent = PROF_ERR[lang] || 'This ID is not allowed'
    input.focus()
    return
  }
  userId = raw
  store.set('j3d_user_id', userId)
  renderUserIdSettingRow()
  closeUserIdModal()
  if (_uidCallback) { const cb = _uidCallback; _uidCallback = null; cb(userId) }
}

function renderUserIdSettingRow() {
  const el = document.getElementById('setting-uid-val')
  const NOT_SET = { ko:'미설정', ja:'未設定', zh:'未设置', es:'No establecido', pt:'Não definido', hi:'सेट नहीं', vi:'Chưa đặt', th:'ยังไม่ตั้งค่า' }
  if (el) el.textContent = userId || NOT_SET[lang] || 'Not set'
}

function changeUserId() {
  openUserIdModal(() => renderUserIdSettingRow(), { mandatory: false, isEdit: true })
}
window._changeUserId = changeUserId

document.getElementById('uid-submit-btn')?.addEventListener('click', submitUserId)
document.getElementById('uid-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') submitUserId()
})
// Only allow alphanumeric input
document.getElementById('uid-input')?.addEventListener('input', e => {
  const el = e.target
  const pos = el.selectionStart
  const cleaned = el.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)
  if (el.value !== cleaned) { el.value = cleaned; el.setSelectionRange(pos, pos) }
  const errEl = document.getElementById('uid-err')
  if (errEl && cleaned) errEl.textContent = ''
})

let selectedMode  = 'classic'
let currentLbMode = 'classic'
let pendingCoinAd  = null   // { earned, score, mode, histKey, displayScore, isNewBest }
let currentHintStep = -1
window._tutorialDone = store.get('j3d_tutorial_done', false)

// ─── DOM ──────────────────────────────────────────────────────────────────────
const lobbyEl   = document.getElementById('lobby')
const goFlashEl = document.getElementById('go-flash')
const hudEl     = document.getElementById('hud')
const hintEl      = document.getElementById('game-hint')
const hintEmojiEl = document.getElementById('hint-emoji')
const hintTextEl  = document.getElementById('hint-text')
const hintOkEl    = document.getElementById('hint-ok')

// ─── Mode helpers ─────────────────────────────────────────────────────────────
function modeKeys(mode) {
  return {
    best: mode==='classic' ? 'j3d_best' : mode==='timeattack' ? 'j3d_ta_best' : mode==='wc2026' ? 'j3d_wc_best' : 'j3d_ch_best',
    hist: mode==='classic' ? 'j3d_history' : mode==='timeattack' ? 'j3d_ta_history' : mode==='wc2026' ? 'j3d_wc_history' : 'j3d_ch_history',
    unit: mode==='challenge' ? 'm' : '',
  }
}

// ─── Coins ────────────────────────────────────────────────────────────────────
function saveCoins() { store.set('j3d_coins', coins) }
function refreshCoinDisplay() {
  document.getElementById('coin-display').textContent      = coins.toLocaleString()
  document.getElementById('play-coin-display').textContent = coins.toLocaleString()
}

// ─── Tutorial ─────────────────────────────────────────────────────────────────
let tutorialDone = store.get('j3d_tutorial_v2', false)
let _tutSlide    = 0
let _tutSlides   = []

function buildTutSlides() {
  const nation   = NATIONS.find(n => n.code === wcCountry)
  const flagName = nation
    ? `${nation.flag} ${lang==='ko' ? nation.nameKo : nation.name}`
    : '🌍'

  return [
    {
      emoji: '👟',
      title: lang==='ko' ? '공을 차세요!' : 'Kick the Ball!',
      desc:  lang==='ko'
        ? '화면 아무 곳이나 탭하면 발이 그 위치로 이동해요. 공 바로 아래를 노려 차올리세요!'
        : 'Tap anywhere to move your foot to that spot. Aim just under the ball and kick it up!',
    },
    {
      emoji: '⚽',
      title: lang==='ko' ? '점수 올리기' : 'Score Points',
      desc:  lang==='ko'
        ? '킥 1번 = +1점! 공이 바닥에 닿으면 끝나요. 기록은 자동으로 저장되고 리더보드에 올라가요.'
        : 'Each kick = +1 point! The game ends when the ball hits the floor. Your record is saved automatically.',
    },
    {
      emoji: '🏅',
      title: lang==='ko' ? '4가지 모드' : '4 Game Modes',
      desc:  lang==='ko' ? '원하는 목표에 맞게 모드를 골라보세요' : 'Pick the mode that matches your goal',
      extra: lang==='ko'
        ? ['⚽ Classic — 최대한 오래 버티기', '⏱ Time Attack — 30초 최다 킥', '🎯 Challenge — 30초 최고 높이', '🏆 WC 2026 — 7경기 토너먼트 우승']
        : ['⚽ Classic — juggle as long as possible', '⏱ Time Attack — max kicks in 30s', '🎯 Challenge — max height in 30s', '🏆 WC 2026 — win 7 rounds to champion'],
    },
    {
      emoji: '🪙',
      title: lang==='ko' ? '코인 & 샵' : 'Coins & Shop',
      desc:  lang==='ko'
        ? '게임 중 공중에 떠다니는 코인을 잡으세요! 샵에서 특수 능력 선수, 새 공, 스타디움을 살 수 있어요.'
        : 'Catch floating coins mid-game! Spend them in the Shop to unlock players with special abilities, cool balls & stadiums.',
    },
    {
      emoji: nation?.flag || '🌍',
      title: lang==='ko' ? `${flagName} 대표!` : `Go ${flagName}!`,
      desc:  lang==='ko'
        ? `WC 2026 모드에서 ${flagName}을(를) 대표해 조별리그부터 결승까지 7경기를 통과하면 월드컵 챔피언! 설정에서 언제든 국가 변경 가능해요.`
        : `Represent ${flagName} in WC 2026 mode! Clear 7 rounds from Group Stage to the Final to become World Champion. You can change your country in Settings.`,
    },
    {
      emoji: '🚀',
      title: lang==='ko' ? '준비 완료!' : "You're All Set!",
      desc:  lang==='ko'
        ? '공이 기다리고 있어요. 행운을 빕니다! 🎉\n\n설정에서 언제든지 다시 볼 수 있어요.'
        : "The ball is waiting — good luck out there! 🎉\n\nYou can replay this tutorial anytime from Settings.",
      isLast: true,
    },
  ]
}

function _renderTutSlide() {
  const slide  = _tutSlides[_tutSlide]
  const areaEl = document.getElementById('tut-slide-area')
  const dotsEl = document.getElementById('tut-dots')
  const nextBtn = document.getElementById('tut-next-btn')
  const skipBtn = document.getElementById('tut-skip-btn')
  if (!areaEl || !slide) return

  // Dots
  if (dotsEl) {
    dotsEl.innerHTML = _tutSlides.map((_, i) =>
      `<div class="tut-dot${i === _tutSlide ? ' active' : ''}"></div>`
    ).join('')
  }

  // Extra info box (array of lines)
  const extraHtml = slide.extra
    ? `<div class="tut-slide-extra">${slide.extra.map(l => `<div>${l}</div>`).join('')}</div>`
    : ''

  // Desc may have \n\n for paragraph breaks
  const descHtml = (slide.desc || '').replace(/\n\n/g, '<br><br>')

  areaEl.style.opacity = '0'
  areaEl.style.transform = 'translateY(10px)'
  areaEl.innerHTML = `
    <div class="tut-slide-emoji">${slide.emoji}</div>
    <div class="tut-slide-title">${slide.title}</div>
    <div class="tut-slide-desc">${descHtml}</div>
    ${extraHtml}
  `
  requestAnimationFrame(() => {
    areaEl.style.transition = 'opacity .22s ease, transform .22s ease'
    areaEl.style.opacity = '1'
    areaEl.style.transform = 'translateY(0)'
  })

  const isLast = slide.isLast
  if (nextBtn) nextBtn.textContent = isLast
    ? (lang==='ko' ? '🚀 시작하기!' : "🚀 Let's Play!")
    : (lang==='ko' ? '다음 →' : 'Next →')
  if (skipBtn) skipBtn.style.display = isLast ? 'none' : ''
}

function openTutorial() {
  _tutSlide  = 0
  _tutSlides = buildTutSlides()
  const el = document.getElementById('tutorial-modal')
  if (!el) return
  el.classList.remove('hidden')
  requestAnimationFrame(() => el.classList.add('visible'))
  _renderTutSlide()
}

function closeTutorial() {
  tutorialDone = true
  store.set('j3d_tutorial_v2', true)
  const el = document.getElementById('tutorial-modal')
  if (!el) return
  el.classList.remove('visible')
  setTimeout(() => el.classList.add('hidden'), 300)
}

function _advanceTutorial() {
  if (_tutSlide < _tutSlides.length - 1) {
    _tutSlide++
    _renderTutSlide()
  } else {
    closeTutorial()
  }
}

document.getElementById('tut-next-btn')?.addEventListener('click', _advanceTutorial)
document.getElementById('tut-skip-btn')?.addEventListener('click', closeTutorial)
window._openTutorial = openTutorial

// ─── In-game side rank panels ─────────────────────────────────────────────────
const SIDE_MEDALS = ['🥇','🥈','🥉','4','5','6','7','8','9','10']

function _sideRows(entries, unit = '', mode = '') {
  const myId = userId || null
  const rows = entries.map((e, i) => {
    const name   = e.name || 'Player'
    const isMe   = myId && name === myId
    const medal  = i < 3 ? SIDE_MEDALS[i] : `${i + 1}`
    const score  = e.score + unit
    const delBtn = _isAdmin && mode
      ? `<button class="admin-del-btn" title="Delete" onclick="window._adminDel('${mode}',${e.score},'${name.replace(/'/g,'\\\'')}')">🗑</button>`
      : ''
    return `<div class="side-rank-row${isMe ? ' me' : ''}">
      <span class="side-rank-medal">${medal}</span>
      <span class="side-rank-name">${name}</span>
      <span class="side-rank-score">${score}</span>
      ${delBtn}
    </div>`
  }).join('')
  return `<div class="side-rank-rows">${rows}</div>`
}

function renderSidePanels() {
  const classicEl = document.getElementById('side-classic')
  const taEl      = document.getElementById('side-ta')
  const chEl      = document.getElementById('side-ch')

  // ── Classic: top 10
  // Fetch from server (or local fallback) — async, updates boards when ready
  Promise.all([
    fetchLeaderboard('classic',    10),
    fetchLeaderboard('timeattack',  3),
    fetchLeaderboard('challenge',   3),
  ]).then(([classicTop, taTop, chTop]) => {
    if (classicEl) {
      if (!classicTop.length) {
        classicEl.classList.remove('visible'); classicEl.innerHTML = ''
      } else {
        classicEl.innerHTML = `<div class="side-panel-title">⚽ Classic${_isAdmin?' 🔑':''}</div>` + _sideRows(classicTop, '', 'classic')
        classicEl.classList.add('visible')
      }
    }
    if (taEl) {
      if (!taTop.length) {
        taEl.classList.remove('visible'); taEl.innerHTML = ''
      } else {
        taEl.innerHTML = `<div class="side-panel-title">⏱ Time Attack${_isAdmin?' 🔑':''}</div>` + _sideRows(taTop, '', 'timeattack')
        taEl.classList.add('visible')
      }
    }
    if (chEl) {
      if (!chTop.length) {
        chEl.classList.remove('visible'); chEl.innerHTML = ''
      } else {
        chEl.innerHTML = `<div class="side-panel-title">🎯 Challenge${_isAdmin?' 🔑':''}</div>` + _sideRows(chTop, 'm', 'challenge')
        chEl.classList.add('visible')
      }
    }
    // ── Push to 3D scoreboards in the scene ──
    window.dispatchEvent(new CustomEvent('rankUpdate', {
      detail: { classic: classicTop, ta: taTop, ch: chTop }
    }))
  })
}

function hideSidePanels() {
  document.getElementById('side-classic')?.classList.remove('visible')
  document.getElementById('side-ta')?.classList.remove('visible')
  document.getElementById('side-ch')?.classList.remove('visible')
}

// ─── Show / hide lobby ────────────────────────────────────────────────────────
export function showLobby(scoreData = null) {
  renderSidePanels()   // always keep rankers visible
  // ── WC 모드 종료 후 원래 장착 공으로 복원 ────────────────────────────────
  emitBallChange(equippedBall)
  hudEl.classList.add('hidden')
  const card = document.getElementById('lobby-card')
  if (scoreData !== null) {
    // After a game → show panel open so player sees their score
    document.getElementById('lobby-last-label').textContent = 'LAST SCORE'
    document.getElementById('lobby-last-score').textContent = scoreData.score
    document.getElementById('lobby-best-badge').classList.toggle('show', !!scoreData.isNewBest)
    card.classList.remove('collapsed')
  } else {
    // First open / returning to lobby without game → panel closed
    document.getElementById('lobby-last-label').textContent = best ? 'BEST' : ''
    document.getElementById('lobby-last-score').textContent = best || '—'
    document.getElementById('lobby-best-badge').classList.remove('show')
    card.classList.add('collapsed')
  }
  refreshStats(selectedMode)
  refreshCoinDisplay()
  lobbyEl.classList.remove('hidden')
  requestAnimationFrame(() => lobbyEl.classList.add('visible'))
}

export function hideLobby() {
  lobbyEl.classList.remove('visible')
  setTimeout(() => lobbyEl.classList.add('hidden'), 320)
  hudEl.classList.remove('hidden')
  // Render side panels after lobby fades out
  setTimeout(() => renderSidePanels(), 350)
}

// ─── WC 2026 result handler ───────────────────────────────────────────────────
function handleWCResult(kicks) {
  if (wcIsChampion()) { showLobby(); return }   // already done
  const r = wcCurrentRound()
  const passed = kicks >= r.target

  // Advance round before displaying (so champion check is correct after)
  if (passed) {
    sfx.milestone()
    wcRound = Math.min(wcRound + 1, WC_ROUNDS.length)
    store.set('j3d_wc_round', wcRound)
    // Track country best score
    if (wcCountry) {
      const cScores = store.get('j3d_wc_cscores', {})
      const prev = cScores[wcCountry] || { best: 0, rounds: 0 }
      cScores[wcCountry] = {
        best:   Math.max(prev.best, kicks),
        rounds: Math.max(prev.rounds, wcRound),  // wcRound already incremented
        userId: userId || prev.userId || 'Player',
      }
      store.set('j3d_wc_cscores', cScores)
      renderWCTicker()   // 전광판 즉시 갱신
    }
    if (wcIsChampion() && !ownedBalls.includes('wc26')) {
      ownedBalls = [...ownedBalls, 'wc26']
      store.set('j3d_owned_balls', ownedBalls)
      setTimeout(() => sfx.coin(), 600)
    }
  }

  // Reuse go-flash but replace "GAME OVER" text
  const goLabelEl = document.getElementById('go-label-text')
  const goValEl   = document.getElementById('go-val')
  const goNewEl   = document.getElementById('go-new')
  const goFlash   = goFlashEl

  if (goLabelEl) {
    if (passed) {
      goLabelEl.textContent = wcIsChampion()
        ? (lang==='ko' ? '🏆 우승!' : '🏆 CHAMPION!')
        : (lang==='ko' ? '✅ 통과!' : '✅ CLEARED!')
      goLabelEl.style.color = wcIsChampion() ? 'var(--gold)' : '#4dff88'
    } else {
      goLabelEl.textContent = lang==='ko' ? '❌ 실패' : '❌ TRY AGAIN'
      goLabelEl.style.color = '#ff6b6b'
    }
  }

  if (goValEl) goValEl.textContent = `${kicks} kicks`
  if (goNewEl) {
    const lbl = lang==='ko' ? r.labelKo : r.label
    goNewEl.classList.remove('hidden')
    goNewEl.textContent = passed
      ? (wcIsChampion()
          ? (lang==='ko' ? '🌍 WC26 공식구 잠금 해제!' : '🌍 WC26 ball unlocked!')
          : (lang==='ko' ? `${lbl} 통과 · 다음 라운드로!` : `${lbl} cleared · next round!`))
      : (lang==='ko' ? `목표 ${r.target}킥 · ${kicks}킥 기록` : `Need ${r.target} kicks · got ${kicks}`)
  }

  goFlash.classList.remove('hidden')
  requestAnimationFrame(() => goFlash.classList.add('visible'))

  setTimeout(() => {
    goFlash.classList.remove('visible')
    setTimeout(() => {
      goFlash.classList.add('hidden')
      // Restore default label for next game-over
      if (goLabelEl) { goLabelEl.textContent = 'GAME OVER'; goLabelEl.style.color = '' }
      if (goNewEl)   { goNewEl.textContent = '🏆 NEW BEST!'; goNewEl.classList.add('hidden') }
      renderWCCard()
      showLobby()
    }, 300)
  }, passed ? 2400 : 1800)
}

// ─── Game over ────────────────────────────────────────────────────────────────
export function onGameOver(data) {
  const score = typeof data === 'object' ? data.score : data
  const mode  = typeof data === 'object' ? (data.mode || 'classic') : 'classic'

  // WC tournament mode: separate result flow
  if (mode === 'wc2026') { handleWCResult(score); return }

  const {best:bestKey, hist:histKey, unit} = modeKeys(mode)

  games++
  store.set('j3d_games', games)
  if (mode === 'classic') { lastScore = score; store.set('j3d_last', score) }

  const prevBest  = store.get(bestKey, 0)
  const isNewBest = score > prevBest
  if (isNewBest) { store.set(bestKey, score); if (mode==='classic') best = score; sfx.newRecord() }

  const earned       = Math.max(5, Math.floor(score) * 2)
  const displayScore = score + unit

  document.getElementById('go-val').textContent = displayScore
  document.getElementById('go-new').classList.toggle('hidden', !isNewBest)
  goFlashEl.classList.remove('hidden')
  requestAnimationFrame(() => goFlashEl.classList.add('visible'))

  setTimeout(() => {
    goFlashEl.classList.remove('visible')
    setTimeout(() => {
      goFlashEl.classList.add('hidden')
      // Show coin-multiplier ad offer before returning to lobby
      pendingCoinAd = { earned, score, mode, histKey, displayScore, isNewBest }
      showCoinAdPrompt()
    }, 300)
  }, 1400)
}

// ─── Mock Ad Overlay (로컬 dev fallback) ──────────────────────────────────────
// Verse8 환경에서는 ads.js가 @verse8/ads SDK를 자동 사용하므로 이 함수는 호출되지 않음.
// showRewarded(PLACEMENT, showMockAd) 호출 시 SDK 불가 → showMockAd로 fallback.
const adOverlayEl   = document.getElementById('ad-overlay')
const adCountdownEl = document.getElementById('ad-countdown')
const adSkipBtn     = document.getElementById('ad-skip-btn')
let _adCallback = null
let _adTick     = null

function showMockAd(onComplete) {
  _adCallback = onComplete
  let secs = 5
  adCountdownEl.textContent = secs
  adSkipBtn.disabled = true
  adSkipBtn.textContent = 'Please wait…'
  adOverlayEl.classList.remove('hidden')
  requestAnimationFrame(() => adOverlayEl.classList.add('visible'))

  clearInterval(_adTick)
  _adTick = setInterval(() => {
    secs--
    adCountdownEl.textContent = secs
    if (secs <= 0) {
      clearInterval(_adTick)
      adSkipBtn.disabled = false
      adSkipBtn.textContent = 'Continue ✓'
    }
  }, 1000)
}

function _closeAdOverlay() {
  clearInterval(_adTick)
  adOverlayEl.classList.remove('visible')
  setTimeout(() => adOverlayEl.classList.add('hidden'), 300)
  if (_adCallback) { const cb = _adCallback; _adCallback = null; cb() }
}
adSkipBtn.addEventListener('click', () => { if (!adSkipBtn.disabled) _closeAdOverlay() })

// ─── Ad helpers ───────────────────────────────────────────────────────────────
// 광고 관련 토스트 (dismissed / failed 피드백)
function _adToast(msg) {
  let el = document.getElementById('ad-toast')
  if (!el) {
    el = document.createElement('div')
    el.id = 'ad-toast'
    el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.78);color:#fff;border-radius:20px;padding:8px 18px;font-size:13px;z-index:9999;pointer-events:none;transition:opacity .4s'
    document.body.appendChild(el)
  }
  el.textContent = msg
  el.style.opacity = '1'
  clearTimeout(el._t)
  el._t = setTimeout(() => { el.style.opacity = '0' }, 2500)
}

// unsupported_env 감지 → 광고 버튼 전체 숨김
function _hideAdButtons() {
  document.querySelectorAll('.ad-watch-btn, #revive-watch-btn, #coin-ad-watch-btn').forEach(el => {
    el.style.display = 'none'
  })
}
window.addEventListener('adUnsupported', _hideAdButtons)

// 버튼 busy 상태 관리
function _setAdBtnBusy(btn, busy) {
  if (!btn) return
  btn.disabled = busy
  btn.style.opacity = busy ? '0.5' : ''
}

// ─── Revive prompt ────────────────────────────────────────────────────────────
const revivePromptEl = document.getElementById('revive-prompt')

function _openRevivePrompt() {
  revivePromptEl.classList.remove('hidden')
  requestAnimationFrame(() => revivePromptEl.classList.add('visible'))
}
function _closeRevivePrompt(cb) {
  revivePromptEl.classList.remove('visible')
  setTimeout(() => { revivePromptEl.classList.add('hidden'); cb?.() }, 300)
}

document.getElementById('revive-watch-btn').addEventListener('click', () => {
  if (isBusy()) return
  const btn = document.getElementById('revive-watch-btn')
  _closeRevivePrompt(async () => {
    _setAdBtnBusy(btn, true)
    const status = await showRewarded(PLACEMENTS.REVIVE, showMockAd, { verify: true })
    _setAdBtnBusy(btn, false)
    if (status === 'rewarded')    window.dispatchEvent(new CustomEvent('reviveGranted'))
    else if (status === 'dismissed') { _adToast('전체 광고를 시청해야 부활할 수 있어요'); window.dispatchEvent(new CustomEvent('reviveDeclined')) }
    else if (status === 'failed')    { _adToast('광고를 불러올 수 없어요. 잠시 후 다시 시도하세요'); window.dispatchEvent(new CustomEvent('reviveDeclined')) }
    else window.dispatchEvent(new CustomEvent('reviveDeclined'))
  })
})
document.getElementById('revive-skip-btn').addEventListener('click', () => {
  _closeRevivePrompt(() => window.dispatchEvent(new CustomEvent('reviveDeclined')))
})
window.addEventListener('requestRevive', () => _openRevivePrompt())

// ─── Coin multiplier ad prompt ────────────────────────────────────────────────
const coinAdPromptEl = document.getElementById('coin-ad-prompt')

function showCoinAdPrompt() {
  const { earned, displayScore } = pendingCoinAd
  document.getElementById('coin-ad-score').textContent  = displayScore
  document.getElementById('coin-ad-earned').textContent = earned
  document.getElementById('coin-ad-triple').textContent = earned * 3
  document.getElementById('coin-ad-keep').textContent   = earned
  coinAdPromptEl.classList.remove('hidden')
  requestAnimationFrame(() => coinAdPromptEl.classList.add('visible'))
}

function _closeCoinAdPrompt(then) {
  coinAdPromptEl.classList.remove('visible')
  setTimeout(() => { coinAdPromptEl.classList.add('hidden'); then() }, 300)
}

function _finalizeCoinAd(tripled) {
  const { earned, score, histKey, displayScore, isNewBest } = pendingCoinAd
  pendingCoinAd = null
  coins += tripled ? earned * 3 : earned
  saveCoins()
  // Always use registered userId — no name input modal needed
  const recName = userId || store.get('j3d_last_name', null) || 'Player'
  saveRecord(score, histKey, recName)
  refreshCoinDisplay()
  showLobby({ score: displayScore, isNewBest })
}

document.getElementById('coin-ad-watch-btn').addEventListener('click', () => {
  if (isBusy()) return
  const btn = document.getElementById('coin-ad-watch-btn')
  _closeCoinAdPrompt(async () => {
    _setAdBtnBusy(btn, true)
    const status = await showRewarded(PLACEMENTS.DOUBLE_COINS, showMockAd, { verify: true })
    _setAdBtnBusy(btn, false)
    if (status === 'dismissed') _adToast('전체 광고를 시청해야 코인을 받을 수 있어요')
    if (status === 'failed')    _adToast('광고를 불러올 수 없어요. 잠시 후 다시 시도하세요')
    _finalizeCoinAd(status === 'rewarded')
  })
})
document.getElementById('coin-ad-skip-btn').addEventListener('click', () => {
  _closeCoinAdPrompt(() => _finalizeCoinAd(false))
})

// ─── Record helpers ───────────────────────────────────────────────────────────
const HIST_TO_MODE = {
  j3d_history:    'classic',
  j3d_ta_history: 'timeattack',
  j3d_ch_history: 'challenge',
}
function saveRecord(score, histKey, name) {
  const mode = HIST_TO_MODE[histKey] || 'classic'
  // submitScore handles both local save AND server submit (with fallback)
  submitScore({ mode, score, userId: name || 'Player', country: wcCountry, char: equipped })
}

// ─── Name modal — removed: userId is used automatically ──────────────────────
// Records are saved with userId (set at first launch) via _finalizeCoinAd.

// ─── In-game hints ────────────────────────────────────────────────────────────
const HINTS = [
  { emoji:'👆', key:'hint0' },
  { emoji:'⚽', key:'hint1' },
  { emoji:'🌊', key:'hint2' },
]
let hintTimer = null

function showGameHint(step) {
  if (store.get('j3d_tutorial_done', false)) return
  const h = HINTS[step]; if (!h) return
  currentHintStep = step
  hintEmojiEl.textContent = h.emoji
  hintTextEl.textContent  = t(h.key)
  hintOkEl.textContent    = t('hintOk')
  hintEl.classList.remove('hidden')
  clearTimeout(hintTimer)
  hintTimer = setTimeout(dismissHint, 5000)
}

function dismissHint() {
  clearTimeout(hintTimer)
  hintEl.classList.add('hidden')
  if (currentHintStep >= 2) {
    store.set('j3d_tutorial_done', true)
    window._tutorialDone = true
  }
}

hintOkEl?.addEventListener('click', dismissHint)
window.addEventListener('showHint', e => showGameHint(e.detail))

// ─── Stats ────────────────────────────────────────────────────────────────────
function refreshStats(mode = 'classic') {
  games     = store.get('j3d_games', 0)
  lastScore = store.get('j3d_last', null)
  if (mode === 'wc2026') {
    const roundNum  = Math.min(wcRound + 1, WC_ROUNDS.length)
    const totalRnds = WC_ROUNDS.length
    const r = wcCurrentRound()
    document.getElementById('stat-best').textContent  = wcIsChampion() ? '🏆' : `R${roundNum}/${totalRnds}`
    document.getElementById('stat-last').textContent  = wcIsChampion() ? 'CHAMP' : (r ? `${r.target}` : '—')
    document.getElementById('stat-games').textContent = wcIsChampion() ? '✓' : '—'
    return
  }
  const {best:bestKey, unit} = modeKeys(mode)
  const modeBest = store.get(bestKey, 0)
  document.getElementById('stat-best').textContent  = modeBest + unit
  document.getElementById('stat-last').textContent  = mode==='classic' ? (lastScore ?? '—') : '—'
  document.getElementById('stat-games').textContent = games
}

// ─── Char events ─────────────────────────────────────────────────────────────
function emitCharChange(id) {
  const p = PLAYERS.find(x => x.id===id)
  if (p) window.dispatchEvent(new CustomEvent('charChanged', {detail:{colors:p.colors, hairStyle:p.hairStyle}}))
}
function emitAbility(id) {
  const p = PLAYERS.find(x => x.id===id)
  window._playerAbility = p?.ability || {}
  window.dispatchEvent(new CustomEvent('charAbility', {detail: window._playerAbility}))
}

// ─── Ball events ──────────────────────────────────────────────────────────────
function emitBallChange(id) {
  const b = BALLS.find(x => x.id===id)
  if (b) window.dispatchEvent(new CustomEvent('ballChanged', {detail: b}))
}

// ─── Stadium events ───────────────────────────────────────────────────────────
function emitStadiumChange(id) {
  const s = STADIUMS.find(x => x.id===id)
  if (s) window.dispatchEvent(new CustomEvent('stadiumChanged', {detail: s}))
}

// ─── Preview pane ─────────────────────────────────────────────────────────────
function hexToCSS(hex) { return '#' + hex.toString(16).padStart(6,'0') }

function updatePreviewPane(id) {
  const p = PLAYERS.find(x => x.id===id); if (!p) return
  document.getElementById('cpane-flag').textContent = p.country.split(' ')[0]
  document.getElementById('cpane-kit').innerHTML = `
    <div class="kit-shirt"  style="background:${hexToCSS(p.colors.shirt)}"></div>
    <div class="kit-shorts" style="background:${hexToCSS(p.colors.shorts)}"></div>`
  document.getElementById('cpane-name').textContent = p.name
  document.getElementById('cpane-full').textContent =
    `${p.full} · ${p.country.split(' ').slice(1).join(' ')}`
  document.getElementById('cpane-bdo').textContent = ''
  document.getElementById('cpane-ability').textContent = p.ability?.desc || ''

  const isOwned=owned.includes(p.id), isEquipped=equipped===p.id, canAfford=coins>=p.price
  const adDef = AD_UNLOCK[p.id]   // defined only for robben & modric

  const actionEl = document.getElementById('cpane-action')
  if (isEquipped) {
    actionEl.innerHTML = `<button class="btn-equip btn-equipped" data-id="${p.id}" data-action="noop">${t('equippedBtn')}</button>`
  } else if (isOwned) {
    actionEl.innerHTML = `<button class="btn-equip btn-own" data-id="${p.id}" data-action="equip">${t('wearBtn')}</button>`
  } else if (adDef) {
    // Ad-unlock players: ignore coin balance, show ad progress button
    const prog = adProgress(p.id)
    const step = prog + 1
    const total = adDef.adsRequired
    const label = total > 1 ? `📺 Watch Ad (${step}/${total})` : `📺 Watch Ad (1 Ad)`
    actionEl.innerHTML = `<button class="btn-equip btn-ad-unlock" data-id="${p.id}" data-action="adunlock">${label}</button>`
  } else if (canAfford) {
    actionEl.innerHTML = `<button class="btn-equip btn-buy" data-id="${p.id}" data-action="buy">🪙 ${p.price.toLocaleString()}</button>`
  } else {
    actionEl.innerHTML = `<button class="btn-equip btn-buy-locked" disabled>🪙 ${p.price.toLocaleString()}</button>`
  }

  actionEl.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      if (btn.dataset.action==='equip')    equipPlayer(btn.dataset.id)
      if (btn.dataset.action==='buy')      buyPlayer(btn.dataset.id)
      if (btn.dataset.action==='adunlock') adUnlockPlayer(btn.dataset.id)
    })
  })
}

// ─── Compact player list ──────────────────────────────────────────────────────
function renderPlayers() {
  const list = document.getElementById('player-list')
  list.innerHTML = PLAYERS.map(p => {
    const isOwned=owned.includes(p.id), isEquipped=equipped===p.id
    const isPrev=previewing===p.id, canAfford=coins>=p.price
    const adDef = AD_UNLOCK[p.id]
    let priceHtml
    if (isEquipped)       priceHtml=`<span class="pcard-price p-owned">✓ ON</span>`
    else if (isOwned)     priceHtml=`<span class="pcard-price p-owned">OWNED</span>`
    else if (adDef) {
      const prog = adProgress(p.id)
      const tag  = `📺 ×${adDef.adsRequired - prog}`
      priceHtml  = `<span class="pcard-price" style="color:#bb77ff">${tag}</span>`
    }
    else if (canAfford)   priceHtml=`<span class="pcard-price p-affordable">🪙${p.price >= 1000 ? (p.price/1000).toFixed(0)+'K' : p.price}</span>`
    else                  priceHtml=`<span class="pcard-price p-locked">🪙${p.price >= 1000 ? (p.price/1000).toFixed(0)+'K' : p.price}</span>`
    const cls=['player-card', isEquipped?'equipped':'', isPrev&&!isEquipped?'selected':''].filter(Boolean).join(' ')
    return `<div class="${cls}" data-id="${p.id}">
      <span class="pcard-flag">${p.country.split(' ')[0]}</span>
      <span class="pcard-name">${p.name}</span>
      ${priceHtml}
    </div>`
  }).join('')
  list.querySelectorAll('.player-card').forEach(card =>
    card.addEventListener('click', () => previewPlayer(card.dataset.id))
  )
  // Scroll the selected card into view
  const sel = list.querySelector('.player-card.equipped, .player-card.selected')
  if (sel) sel.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
}

function previewPlayer(id) {
  if (previewing===id) return
  previewing=id; emitCharChange(id); updatePreviewPane(id); renderPlayers()
}

// ─── Ball rendering ───────────────────────────────────────────────────────────
function updateBallAction() {
  const row = document.getElementById('ball-action'); if (!row) return
  const b = BALLS.find(x => x.id === prevBall); if (!b) { row.innerHTML=''; return }
  const isOwned = ownedBalls.includes(b.id), isEquipped = equippedBall === b.id
  const canAfford = coins >= b.price
  const gDesc = b.gimmick?.descKey ? t(b.gimmick.descKey) : null
  const gimmickHtml = gDesc ? `<span class="irow-gimmick">${gDesc}</span>` : ''
  let btn
  if (isEquipped)     btn = `<button class="irow-btn equipped" disabled>${t('itemEquipped')}</button>`
  else if (isOwned)   btn = `<button class="irow-btn can-equip" data-equip-ball="${b.id}">${t('itemEquip')}</button>`
  else if (canAfford) btn = `<button class="irow-btn can-buy" data-buy-ball="${b.id}">🪙 ${b.price.toLocaleString()}</button>`
  else                btn = `<button class="irow-btn locked" disabled>🪙 ${b.price.toLocaleString()}</button>`
  row.innerHTML = `<span class="irow-label">${b.emoji} ${t(b.nameKey)}</span>${gimmickHtml}${btn}`
}

function renderBalls() {
  const list = document.getElementById('ball-list'); if (!list) return
  list.innerHTML = BALLS.map(b => {
    const isOwned=ownedBalls.includes(b.id), isEquipped=equippedBall===b.id
    const isPrev=prevBall===b.id, canAfford=coins>=b.price
    let priceHtml
    if (isEquipped)    priceHtml=`<span class="pcard-price p-owned">✓ ON</span>`
    else if (isOwned)  priceHtml=`<span class="pcard-price p-owned">OWNED</span>`
    else if (canAfford)priceHtml=`<span class="pcard-price p-affordable">🪙${b.price>=1000?(b.price/1000).toFixed(0)+'K':b.price}</span>`
    else               priceHtml=`<span class="pcard-price p-locked">🪙${b.price>=1000?(b.price/1000).toFixed(0)+'K':b.price}</span>`
    const gDesc = b.gimmick?.descKey ? t(b.gimmick.descKey) : null
    if (gDesc) priceHtml += `<span class="pcard-gimmick">${gDesc}</span>`
    const cls=['player-card', isEquipped?'equipped':'', isPrev&&!isEquipped?'selected':''].filter(Boolean).join(' ')
    return `<div class="${cls}" data-id="${b.id}">
      <span class="pcard-flag">${b.emoji}</span>
      <span class="pcard-name">${t(b.nameKey)}</span>
      ${priceHtml}
    </div>`
  }).join('')
  list.querySelectorAll('.player-card').forEach(card =>
    card.addEventListener('click', () => previewBall(card.dataset.id))
  )
  const sel = list.querySelector('.player-card.equipped, .player-card.selected')
  if (sel) sel.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' })
  updateBallAction()
}

function previewBall(id) {
  prevBall = id; emitBallChange(id); renderBalls()
}
function equipBall(id) {
  equippedBall = id; prevBall = id
  store.set('j3d_equipped_ball', id); store.set('j3d_owned_balls', ownedBalls)
  emitBallChange(id); renderBalls()
}
function buyBall(id) {
  const b=BALLS.find(x=>x.id===id); if (!b||coins<b.price) return
  coins-=b.price; saveCoins(); ownedBalls.push(id)
  store.set('j3d_owned_balls', ownedBalls); refreshCoinDisplay(); sfx.shopBuy(); equipBall(id)
}

// ─── Stadium rendering ────────────────────────────────────────────────────────
function updateStadiumAction() {
  const row = document.getElementById('stadium-action'); if (!row) return
  const s = STADIUMS.find(x => x.id === prevStad); if (!s) { row.innerHTML=''; return }
  const isOwned = ownedStads.includes(s.id), isEquipped = equippedStad === s.id
  const canAfford = coins >= s.price
  const gDesc = s.gimmick?.descKey ? t(s.gimmick.descKey) : null
  const gimmickHtml = gDesc ? `<span class="irow-gimmick">${gDesc}</span>` : ''
  let btn
  if (isEquipped)     btn = `<button class="irow-btn equipped" disabled>${t('itemEquipped')}</button>`
  else if (isOwned)   btn = `<button class="irow-btn can-equip" data-equip-stad="${s.id}">${t('itemEquip')}</button>`
  else if (canAfford) btn = `<button class="irow-btn can-buy" data-buy-stad="${s.id}">🪙 ${s.price.toLocaleString()}</button>`
  else                btn = `<button class="irow-btn locked" disabled>🪙 ${s.price.toLocaleString()}</button>`
  row.innerHTML = `<span class="irow-label">${s.emoji} ${t(s.nameKey)}</span>${gimmickHtml}${btn}`
}

function renderStadiums() {
  const list = document.getElementById('stadium-list'); if (!list) return
  list.innerHTML = STADIUMS.map(s => {
    const isOwned=ownedStads.includes(s.id), isEquipped=equippedStad===s.id
    const isPrev=prevStad===s.id, canAfford=coins>=s.price
    let priceHtml
    if (isEquipped)    priceHtml=`<span class="pcard-price p-owned">✓ ON</span>`
    else if (isOwned)  priceHtml=`<span class="pcard-price p-owned">OWNED</span>`
    else if (canAfford)priceHtml=`<span class="pcard-price p-affordable">🪙${s.price>=1000?(s.price/1000).toFixed(0)+'K':s.price}</span>`
    else               priceHtml=`<span class="pcard-price p-locked">🪙${s.price>=1000?(s.price/1000).toFixed(0)+'K':s.price}</span>`
    const sGDesc = s.gimmick?.descKey ? t(s.gimmick.descKey) : null
    if (sGDesc) priceHtml += `<span class="pcard-gimmick">${sGDesc}</span>`
    const cls=['player-card stad-card', isEquipped?'equipped':'', isPrev&&!isEquipped?'selected':''].filter(Boolean).join(' ')
    return `<div class="${cls}" data-id="${s.id}" style="--stad-bg:${stadEmojiBg(s)}">
      <span class="pcard-flag">${s.emoji}</span>
      <span class="pcard-name">${t(s.nameKey)}</span>
      ${priceHtml}
    </div>`
  }).join('')
  list.querySelectorAll('.player-card').forEach(card =>
    card.addEventListener('click', () => previewStadium(card.dataset.id))
  )
  const sel = list.querySelector('.player-card.equipped, .player-card.selected')
  if (sel) sel.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' })
  updateStadiumAction()
}

function stadEmojiBg(s) {
  // Rough CSS color from stadium bg hex
  const c = s.bg; const r=(c>>16)&255, g=(c>>8)&255, b=c&255
  return `rgba(${r},${g},${b},0.35)`
}

function previewStadium(id) {
  prevStad = id; emitStadiumChange(id); renderStadiums()
}
function equipStadium(id) {
  equippedStad = id; prevStad = id
  store.set('j3d_equipped_stad', id); store.set('j3d_owned_stads', ownedStads)
  emitStadiumChange(id); renderStadiums()
}
function buyStadium(id) {
  const s=STADIUMS.find(x=>x.id===id); if (!s||coins<s.price) return
  coins-=s.price; saveCoins(); ownedStads.push(id)
  store.set('j3d_owned_stads', ownedStads); refreshCoinDisplay(); sfx.shopBuy(); equipStadium(id)
}

function equipPlayer(id) {
  equipped=id; previewing=id; store.set('j3d_equipped',id)
  emitCharChange(id); emitAbility(id); updatePreviewPane(id); renderPlayers()
}
function buyPlayer(id) {
  const p=PLAYERS.find(x=>x.id===id); if (!p||coins<p.price) return
  coins-=p.price; saveCoins(); owned.push(id); store.set('j3d_owned',owned)
  refreshCoinDisplay(); equipPlayer(id)
}

async function adUnlockPlayer(id) {
  const cfg = AD_UNLOCK[id]; if (!cfg || owned.includes(id)) return
  if (isBusy()) return
  const placementId = `unlock-${id}`
  const status = await showRewarded(placementId, showMockAd)
  if (status === 'dismissed') { _adToast('전체 광고를 시청해야 해금할 수 있어요'); return }
  if (status === 'failed')    { _adToast('광고를 불러올 수 없어요. 잠시 후 다시 시도하세요'); return }
  if (status !== 'rewarded') return
  if (owned.includes(id)) return   // double-fire guard
  const progressKey = `j3d_adprog_${id}`
  const newProg = adProgress(id) + 1
  if (newProg >= cfg.adsRequired) {
    store.set(progressKey, 0)
    owned.push(id); store.set('j3d_owned', owned)
    equipPlayer(id)
  } else {
    store.set(progressKey, newProg)
    renderPlayers()
    updatePreviewPane(id)
  }
}

// ─── Panel open / close ───────────────────────────────────────────────────────
function openPanel() {
  document.getElementById('lobby-card').classList.remove('collapsed')
}
function closePanel() {
  document.getElementById('lobby-card').classList.add('collapsed')
}
function isPanelOpen() {
  return !document.getElementById('lobby-card').classList.contains('collapsed')
}

// Handle bar — tap to toggle
document.getElementById('lobby-handle').addEventListener('click', () => {
  if (isPanelOpen()) closePanel(); else openPanel()
})

// ─── Shop preview camera toggle ───────────────────────────────────────────────
function setCharPreview(active) {
  document.getElementById('lobby-card').classList.toggle('chars-mode', active)
  window.dispatchEvent(new CustomEvent('charPreviewToggle', { detail: { active } }))
}

// ─── Shop sub-tab switch ──────────────────────────────────────────────────────
function switchShopTab(subTab) {
  shopSubTab = subTab
  document.querySelectorAll('.shop-sub-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.shopTab === subTab))
  document.querySelectorAll('.shop-sub-panel').forEach(p =>
    p.classList.toggle('active', p.id === `shop-${subTab}-panel`))
  // Camera: close-up only for players; wider for balls/stadiums
  window.dispatchEvent(new CustomEvent('charPreviewToggle', {
    detail: { active: subTab === 'players' }
  }))
  // Render content
  if (subTab === 'players') {
    renderPlayers(); updatePreviewPane(previewing || equipped)
  } else if (subTab === 'balls') {
    renderBalls()
  } else if (subTab === 'stadiums') {
    renderStadiums()
  }
}

// ─── Ball/Stadium action delegation ──────────────────────────────────────────
document.addEventListener('click', e => {
  // Shop sub-tab switch
  const subBtn = e.target.closest('.shop-sub-btn')
  if (subBtn?.dataset.shopTab) { switchShopTab(subBtn.dataset.shopTab); return }
  const btn = e.target.closest('[data-buy-ball]')
  if (btn) { buyBall(btn.dataset.buyBall); return }
  const btn2 = e.target.closest('[data-equip-ball]')
  if (btn2) { equipBall(btn2.dataset.equipBall); return }
  const btn3 = e.target.closest('[data-buy-stad]')
  if (btn3) { buyStadium(btn3.dataset.buyStad); return }
  const btn4 = e.target.closest('[data-equip-stad]')
  if (btn4) { equipStadium(btn4.dataset.equipStad); return }
})

// ─── Tab nav ──────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab
    sfx.btnTap()
    // Always expand panel when a tab is tapped
    openPanel()
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'))
    btn.classList.add('active')
    document.getElementById(tab + '-tab').classList.add('active')
    // Character preview camera & shop sub-tabs
    if (tab === 'shop') {
      // Compact panel always when shop is open
      document.getElementById('lobby-card').classList.add('chars-mode')
      // Restore last active sub-tab (also fires camera toggle + render)
      switchShopTab(shopSubTab)
    } else {
      setCharPreview(false)
    }
    if (tab === 'lb')       refreshLeaderboard()
    if (tab === 'settings') { if (bgmModule) renderBGMPlaylist(bgmModule.getBGMState()) }
  })
})

// ─── Country ranking ──────────────────────────────────────────────────────────
function renderCountryRanking() {
  const el = document.getElementById('wc-lb-tab')
  if (!el) return
  const cScores = store.get('j3d_wc_cscores', {})
  const entries = Object.entries(cScores)
    .map(([code, v]) => ({ code, ...v, nation: NATIONS.find(n => n.code === code) }))
    .filter(e => e.nation && e.rounds > 0)  // only show entries that have played
    .sort((a, b) => b.rounds - a.rounds || b.best - a.best)
    .slice(0, 10)   // top 10 only

  if (!entries.length) {
    el.innerHTML = `<div style="text-align:center;padding:32px;color:rgba(255,255,255,.3);font-size:13px">${lang === 'ko' ? '아직 기록 없음 · WC 모드를 플레이하세요!' : 'No scores yet · Play WC mode!'}</div>`
    return
  }

  el.innerHTML = entries.map((e, i) => {
    const isMe = e.code === wcCountry
    const roundLabel = e.rounds >= WC_ROUNDS.length
      ? (lang === 'ko' ? '🏆 우승' : '🏆 Champion')
      : (lang === 'ko' ? WC_ROUNDS[e.rounds - 1]?.labelKo : WC_ROUNDS[e.rounds - 1]?.label) || `R${e.rounds}`
    const displayId = e.userId || 'Player'
    return `<div class="wc-lb-row${isMe ? ' me' : ''}">
      <span class="wc-lb-rank">${RANK_EMOJIS[i]}</span>
      <span class="wc-lb-flag">${e.nation.flag}</span>
      <div class="wc-lb-info">
        <div class="wc-lb-uid">${displayId}</div>
        <div class="wc-lb-round">${roundLabel} · ${lang==='ko'?e.nation.nameKo:e.nation.name}</div>
      </div>
      <span class="wc-lb-kicks">${e.best} <span style="font-size:10px;opacity:.5">kicks</span></span>
    </div>`
  }).join('')
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
function refreshLeaderboard() {
  const lbList   = document.getElementById('lb-list')
  const wcLbTab  = document.getElementById('wc-lb-tab')

  // Toggle which container is visible
  if (wcLbTab)  wcLbTab.style.display  = currentLbMode === 'wc' ? 'flex' : 'none'
  if (lbList)   lbList.style.display   = currentLbMode === 'wc' ? 'none' : 'flex'

  if (currentLbMode === 'wc') {
    renderCountryRanking()
    return
  }

  const {hist:histKey, unit} = modeKeys(currentLbMode)
  const history = store.get(histKey, [])
  if (!history.length) {
    lbList.innerHTML = `<div class="lb-empty">${t('lbEmpty')}</div>`; return
  }
  const sorted = [...history].sort((a,b)=>b.score-a.score).slice(0,10)
  const medals=['🥇','🥈','🥉'], rankC=['gold','silver','bronze']
  lbList.innerHTML = sorted.map((e,i) => {
    const charInfo = PLAYERS.find(p=>p.id===e.char)
    const flag = charInfo ? charInfo.country.split(' ')[0] : '⚽'
    const charName = charInfo ? charInfo.name : '—'
    const name = e.userId || e.name || 'Player'
    const delBtn = _isAdmin
      ? `<button class="admin-del-btn lb-del" title="Delete entry" onclick="window._adminDel('${currentLbMode}',${e.score},'${name.replace(/'/g,'\\\'')}')">🗑</button>`
      : ''
    return `<div class="lb-row">
      <div class="lb-rank ${rankC[i]??''}">${medals[i]??i+1}</div>
      <div class="lb-char-flag" title="${charName}">${flag}</div>
      <div class="lb-name">${name}</div>
      <div class="lb-score">${e.score}${unit}</div>
      ${delBtn}
    </div>`
  }).join('')
}

document.querySelectorAll('.lb-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentLbMode = btn.dataset.lbmode
    document.querySelectorAll('.lb-mode-btn').forEach(b=>b.classList.toggle('active',b===btn))
    refreshLeaderboard()
  })
})

// ─── Mode selection ───────────────────────────────────────────────────────────
document.querySelectorAll('.mode-sel-card:not(.locked)').forEach(card => {
  card.addEventListener('click', () => {
    selectedMode = card.dataset.mode
    document.querySelectorAll('.mode-sel-card').forEach(c=>c.classList.toggle('selected',c.dataset.mode===selectedMode))
    refreshStats(selectedMode)
  })
})

// ─── Play button ──────────────────────────────────────────────────────────────
function launchGame() {
  sfx.btnTap()
  if (selectedMode === 'wc2026' && !wcCountry) {
    openCountryPicker(() => launchGame())
    return
  }
  hintEl?.classList.add('hidden')
  hideLobby()
  // 게임 시작 전 인터스티셜 (비차단 — 결과 무시)
  showInterstitial(PLACEMENTS.GAME_START)
  // ── WC 모드: 트리온다 공 강제 적용 (소유 여부 무관) ──────────────────────
  if (selectedMode === 'wc2026') {
    const trionda = BALLS.find(b => b.id === 'trionda')
    if (trionda) window.dispatchEvent(new CustomEvent('ballChanged', {detail: trionda}))
  }
  const wcTarget = selectedMode === 'wc2026' ? (wcCurrentRound()?.target ?? 999) : 0
  window.dispatchEvent(new CustomEvent('lobbyPlay', {detail:{mode:selectedMode, wcTarget}}))
}
document.getElementById('play-btn').addEventListener('click', launchGame)

// ─── Settings ─────────────────────────────────────────────────────────────────
function bindToggle(id, key) {
  const btn = document.getElementById(id); if (!btn) return
  btn.classList.toggle('on', settings[key])
  btn.addEventListener('click', () => {
    settings[key]=!settings[key]; btn.classList.toggle('on',settings[key])
    store.set('j3d_settings',settings)
    window.dispatchEvent(new CustomEvent('settingChanged',{detail:settings}))
  })
}
bindToggle('toggle-sound',    'sound')
bindToggle('toggle-haptics',  'haptics')
bindToggle('toggle-particles','particles')
bindToggle('toggle-slowmo',   'slowMo')

// ─── Volume sliders ───────────────────────────────────────────────────────────
function updateSliderUI(sl, labelId) {
  const pct = parseInt(sl.value, 10)
  sl.style.background = `linear-gradient(to right, #3cf ${pct}%, rgba(255,255,255,.15) ${pct}%)`
  const lbl = document.getElementById(labelId)
  if (lbl) lbl.textContent = pct + '%'
}

function bindVolSlider(id, key, onChange) {
  const sl = document.getElementById(id); if (!sl) return
  sl.value = settings[key]
  const labelId = id === 'slider-sfx-vol' ? 'sfx-vol-label' : 'bgm-vol-label'
  updateSliderUI(sl, labelId)
  sl.addEventListener('input', () => {
    settings[key] = parseInt(sl.value, 10)
    store.set('j3d_settings', settings)
    window.dispatchEvent(new CustomEvent('settingChanged', {detail:settings}))
    updateSliderUI(sl, labelId)
    if (onChange) onChange(settings[key])
  })
}
bindVolSlider('slider-sfx-vol', 'sfxVol', null)
// BGM slider wired after bgmModule loads (below)

// ─── Language dropdown ────────────────────────────────────────────────────────
function buildLangDropdown() {
  const dd = document.getElementById('lang-dropdown')
  if (!dd) return
  dd.classList.remove('hidden')
  dd.innerHTML = SUPPORTED_LANGS.map(code => {
    const name = LANG_NAMES[code]
    const native = name.split('').slice(0, 6).join('')   // show native script
    const isSelected = code === lang
    return `<div class="lang-opt${isSelected ? ' selected' : ''}" data-lang="${code}">
      <span class="lang-opt-name">${name}</span>
      <span class="lang-opt-label">${code.toUpperCase()}</span>
    </div>`
  }).join('')

  dd.querySelectorAll('.lang-opt').forEach(el => {
    el.addEventListener('click', () => {
      lang = el.dataset.lang
      store.set('j3d_lang', lang)
      applyLang()
      closeLangDropdown()
      sfx.btnTap()
    })
  })
}

function openLangDropdown() {
  buildLangDropdown()
  const dd = document.getElementById('lang-dropdown')
  if (!dd) return
  requestAnimationFrame(() => dd.classList.add('open'))
  const arrow = document.getElementById('lang-toggle-btn')
  if (arrow) arrow.textContent = '▲'
}

function closeLangDropdown() {
  const dd = document.getElementById('lang-dropdown')
  if (!dd) return
  dd.classList.remove('open')
  const arrow = document.getElementById('lang-toggle-btn')
  if (arrow) arrow.textContent = '▼'
  setTimeout(() => { if (!dd.classList.contains('open')) dd.classList.add('hidden') }, 350)
}

function toggleLangDropdown() {
  const dd = document.getElementById('lang-dropdown')
  if (!dd) return
  if (dd.classList.contains('open')) closeLangDropdown()
  else openLangDropdown()
}

document.getElementById('lang-setting-row')?.addEventListener('click', () => {
  sfx.btnTap(); toggleLangDropdown()
})

// ─── BGM ──────────────────────────────────────────────────────────────────────
let bgmModule = null
import('./audio.js').then(m => {
  bgmModule = m
  renderBGMPlaylist(m.getBGMState())
  const btn = document.getElementById('toggle-bgm')
  if (btn) {
    btn.classList.toggle('on', m.getBGMState().enabled)
    btn.addEventListener('click', () => {
      const next=!m.getBGMState().enabled; m.setBGMEnabled(next); btn.classList.toggle('on',next)
    })
  }
  // Sync BGM volume from settings (may differ from audio.js default)
  if (m.setBGMVolume) m.setBGMVolume(settings.bgmVol)
  bindVolSlider('slider-bgm-vol', 'bgmVol', v => { if (m.setBGMVolume) m.setBGMVolume(v) })
}).catch(err => console.warn('BGM load failed', err))

window.addEventListener('bgmState', e => {
  renderBGMPlaylist(e.detail)
  const btn=document.getElementById('toggle-bgm'); if (btn) btn.classList.toggle('on',e.detail.enabled)
  const nowEl=document.getElementById('bgm-now-playing')
  if (nowEl) {
    if (e.detail.currentId && e.detail.enabled) {
      const tr=(bgmModule?.TRACKS||[]).find(x=>x.id===e.detail.currentId)
      nowEl.textContent = tr ? '▶ '+tr.title : '—'
    } else { nowEl.textContent = e.detail.enabled ? 'Ready' : 'Off' }
  }
})

function renderBGMPlaylist(state) {
  const el=document.getElementById('bgm-playlist'); if (!el||!bgmModule) return
  const {order,inPlaylist,currentId,enabled}=state, tracks=bgmModule.TRACKS
  el.innerHTML=order.map((id,i)=>{
    const tr=tracks.find(x=>x.id===id); if (!tr) return ''
    const active=inPlaylist.includes(id), playing=enabled&&currentId===id
    return `<div class="bgm-track-row" data-id="${id}">
      <div class="bgm-track-info">
        <div class="bgm-track-title">${tr.title}</div>
        <div class="bgm-track-playing ${playing?'visible':''}">▶ NOW PLAYING</div>
      </div>
      <div class="bgm-track-controls">
        <button class="bgm-order-btn" data-action="up"   data-id="${id}" ${i===0?'disabled':''}>↑</button>
        <button class="bgm-order-btn" data-action="down" data-id="${id}" ${i===order.length-1?'disabled':''}>↓</button>
        <button class="bgm-toggle-btn ${active?'active':''}" data-action="toggle" data-id="${id}">${active?'✓':'+'}</button>
      </div>
    </div>`
  }).join('')
  el.querySelectorAll('[data-action]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      e.stopPropagation(); const {action,id}=btn.dataset; if (!bgmModule) return
      if (action==='up')     bgmModule.moveTrack(id,-1)
      if (action==='down')   bgmModule.moveTrack(id,1)
      if (action==='toggle') bgmModule.toggleInPlaylist(id)
    })
  })
  el.querySelectorAll('.bgm-track-title').forEach(ti=>
    ti.addEventListener('click',()=>{ if (bgmModule) bgmModule.playTrack(ti.closest('[data-id]').dataset.id) })
  )
}

// ─── applyLang ────────────────────────────────────────────────────────────────
function applyLang() {
  window._t = k => t(k)
  const q=(sel,root=document)=>root.querySelector(sel)
  // Tabs
  ;[['shop','tabShop'],['lb','tabRanks'],['settings','tabSettings']].forEach(([tab,key])=>{
    const s=q(`.tab-btn[data-tab="${tab}"] span:last-child`); if (s) s.textContent=t(key)
  })
  // Mode cards
  renderWCCard()
  ;[['mode-classic-name','classicName'],['mode-classic-desc','classicDesc'],
    ['mode-ta-name','taName'],['mode-ta-desc','taDesc'],
    ['mode-ch-name','chName'],['mode-ch-desc','chDesc'],
  ].forEach(([id,k])=>{ const el=document.getElementById(id); if(el) el.textContent=t(k) })
  // legacy applyLang for mode cards (kept for lb tab rendering)
  ;[['classic','classicName','classicDesc'],['timeattack','taName','taDesc'],['challenge','chName','chDesc']].forEach(([id,nk,dk])=>{
    const card=q(`.mode-sel-card[data-mode="${id}"]`); if (!card) return
    const n=q('.mode-sel-name',card); if (n) n.textContent=t(nk)
    const d=q('.mode-sel-desc',card); if (d) d.textContent=t(dk)
  })
  // Stat labels
  const sls=document.querySelectorAll('.stat-lbl')
  ;['statBest','statLast','statGames'].forEach((k,i)=>{ if (sls[i]) sls[i].textContent=t(k) })
  // Play
  const pb=document.getElementById('play-btn'); if (pb) pb.textContent=t('playBtn')
  const cl=document.getElementById('play-coin-label'); if (cl) cl.textContent=t('coinLabel')
  // GO flash
  const gl=document.getElementById('go-label-text'); if (gl) gl.textContent=t('goOver')
  const gn=document.getElementById('go-new'); if (gn) gn.textContent=t('goNew')
  // LB mode tabs
  ;[['classic','lbClassic'],['timeattack','lbTA'],['challenge','lbCH']].forEach(([m,k])=>{
    const b=q(`.lb-mode-btn[data-lbmode="${m}"]`); if (b) b.textContent=t(k)
  })
  // Settings
  ;[['setting-sound-name','sSound'],['setting-sound-sub','sSoundSub'],
    ['setting-haptics-name','sHaptics'],['setting-haptics-sub','sHapticsSub'],
    ['setting-particles-name','sParticles'],['setting-particles-sub','sParticlesSub'],
    ['setting-slowmo-name','sSlowMo'],['setting-slowmo-sub','sSlowMoSub'],
    ['setting-music-name','sMusic'],['setting-lang-name','sLang'],['setting-lang-sub','sLangSub'],
    ['setting-version-name','sVersion'],['bgm-section-label','bgmSection'],['bgm-playlist-label','sPlaylist'],
  ].forEach(([id,k])=>{ const el=document.getElementById(id); if (el) el.textContent=t(k) })
  // Tutorial row (not in STRINGS — keep simple)
  const tutNameEl = document.getElementById('setting-tutorial-name')
  const tutSubEl  = document.getElementById('setting-tutorial-sub')
  if (tutNameEl) tutNameEl.textContent = lang==='ko' ? '튜토리얼' : 'Tutorial'
  if (tutSubEl)  tutSubEl.textContent  = lang==='ko' ? '게임 방법 보기' : 'How to play'
  // Lang arrow — keep ▼/▲ state, just update sub-label
  const langSubEl = document.getElementById('setting-lang-sub')
  if (langSubEl) langSubEl.textContent = LANG_NAMES[lang] || 'English'
  // Refresh dropdown selected state if open
  const dd = document.getElementById('lang-dropdown')
  if (dd && dd.classList.contains('open')) buildLangDropdown()
  // Hint
  if (!hintEl?.classList.contains('hidden') && HINTS[currentHintStep]) {
    hintTextEl.textContent=t(HINTS[currentHintStep].key); hintOkEl.textContent=t('hintOk')
  }
  renderCountrySettingRow()
  renderUserIdSettingRow()
  // Re-render dynamic
  renderPlayers(); updatePreviewPane(previewing||equipped); refreshStats(selectedMode)
  renderBalls(); renderStadiums()
  if (q('#lb-tab.active')) refreshLeaderboard()
  if (bgmModule) renderBGMPlaylist(bgmModule.getBGMState())
}

// ─── Debug ────────────────────────────────────────────────────────────────────
function triggerDebug() {
  coins=10000; saveCoins(); refreshCoinDisplay(); updatePreviewPane(previewing||equipped); renderPlayers()
}
window.addEventListener('keydown', e=>{ if (e.key==='g'||e.key==='G') triggerDebug() })
let _coinTaps=0,_coinTimer=null
function setupCoinDebugTap() {
  const badge=document.getElementById('coin-badge'); if (!badge) return
  badge.addEventListener('click',()=>{
    _coinTaps++; clearTimeout(_coinTimer)
    if (_coinTaps>=5) { _coinTaps=0; triggerDebug(); return }
    _coinTimer=setTimeout(()=>{ _coinTaps=0 },2000)
  })
}

// ─── Wire events ──────────────────────────────────────────────────────────────
window.addEventListener('gameOver',       e => onGameOver(e.detail))
window.addEventListener('coinCollected',  e => { coins+=(e.detail||0); saveCoins(); refreshCoinDisplay() })

// ─── Mobile keyboard awareness ────────────────────────────────────────────────
// When the soft keyboard opens, the card in #name-modal (which is CSS-centered
// in the full viewport) gets partially hidden behind the keyboard.
// visualViewport.height gives us the *visible* area height, so we can
// translateY the card up exactly enough to re-center it in the visible region.
//
// iOS Safari: window.innerHeight stays fixed, vv.height shrinks → keyboardH > 0
// Android Chrome: browser resizes the fixed-element area automatically,
//                 vv.height also shrinks BUT window.innerHeight often shrinks
//                 too → keyboardH ≈ 0 → no double-compensation needed
;(function initKeyboardAwareness() {
  const vv = window.visualViewport
  if (!vv) return

  function adjust() {
    const keyboardH = Math.max(0, window.innerHeight - vv.height)
    const card = document.querySelector('#name-modal .name-modal-card')
    if (!card) return
    if (keyboardH > 50) {
      // Card naturally sits at (screenH / 2). Visible center = (screenH - keyboardH) / 2.
      // Difference = keyboardH / 2 → shift card up by that amount.
      card.style.transform = `translateY(-${Math.round(keyboardH * 0.5)}px)`
    } else {
      card.style.transform = ''
    }
  }

  vv.addEventListener('resize', adjust)
  vv.addEventListener('scroll', adjust)  // iOS sometimes fires scroll, not resize
})()

// ─── WC 2026 ticker (국가 랭킹 전광판) ────────────────────────────────────────
function renderWCTicker() {
  const wrap    = document.getElementById('wc-ticker-wrap')
  const ticker  = document.getElementById('wc-ticker')
  if (!wrap || !ticker) return

  const cScores = store.get('j3d_wc_cscores', {})
  const entries = Object.entries(cScores)
    .map(([code, v]) => ({ code, ...v, nation: NATIONS.find(n => n.code === code) }))
    .filter(e => e.nation && e.rounds > 0)
    .sort((a, b) => b.rounds - a.rounds || b.best - a.best)
    .slice(0, 20)   // 최대 20개국

  if (!entries.length) {
    // 데이터 없으면 기본 텍스트
    wrap.style.display = 'block'
    const placeholder = lang === 'ko'
      ? '⚽ 첫 번째로 국가를 대표해보세요! · '
      : '⚽ Be the first to represent your nation! · '
    // 두 번 반복 (무한 루프용)
    ticker.innerHTML = `<span class="wc-ticker-item">${placeholder}</span>`.repeat(6)
    ticker.className = 'wc-ticker slow'
    return
  }

  const items = entries.map((e, i) => {
    const medal      = RANK_EMOJIS[i] ?? `${i + 1}`
    const displayId  = e.userId || (lang === 'ko' ? e.nation.nameKo : e.nation.name)
    const roundLabel = e.rounds >= WC_ROUNDS.length ? '🏆' : `R${e.rounds}`
    return `<span class="wc-ticker-item"><span class="ti-medal">${medal}</span>${e.nation.flag} ${displayId} <span style="opacity:.6">${roundLabel}</span></span><span class="wc-ticker-item" style="opacity:.25">·</span>`
  }).join('')

  // 두 번 반복 → 끝에서 처음으로 이어지는 seamless loop
  ticker.innerHTML = items + items
  ticker.className = entries.length <= 3 ? 'wc-ticker slow' : 'wc-ticker'

  wrap.style.display = 'block'
}

// ─── WC 2026 countdown banner ─────────────────────────────────────────────────
;(function initWCBanner() {
  const WC_START = new Date('2026-06-11T00:00:00')
  const WC_END   = new Date('2026-07-20T00:00:00')   // day after final (Jul 19)
  const now      = new Date()
  const banner   = document.getElementById('wc-banner')
  const textEl   = document.getElementById('wc-banner-text')
  if (!banner || !textEl) return

  if (now >= WC_END) return   // tournament over — stay hidden

  banner.classList.remove('hidden')

  if (now < WC_START) {
    const days = Math.ceil((WC_START - now) / 86_400_000)
    textEl.textContent = `⚽ 2026 FIFA World Cup · D-${days}`
  } else {
    banner.classList.add('wc-live')
    textEl.textContent = `🔴 2026 FIFA World Cup · LIVE`
  }

  // 전광판 ticker 렌더 (국가 점수 있으면 바로 표시)
  renderWCTicker()
})()

// ─── Init ─────────────────────────────────────────────────────────────────────
// Flush any scores that failed to reach server while offline
flushPending().catch(() => {})

requestAnimationFrame(() => {
  previewing = equipped
  renderPlayers(); updatePreviewPane(equipped)
  emitCharChange(equipped); emitAbility(equipped)
  emitBallChange(equippedBall)
  emitStadiumChange(equippedStad)
  setupCoinDebugTap()
  applyLang()
  renderCountrySettingRow()
  showLobby()
  renderUserIdSettingRow()
  // First-launch flow  (country FIRST so language auto-sets before ID input):
  // Step A — no country: country picker (lang auto-sets) → ID modal (if needed) → tutorial
  // Step B — has country, no ID: ID modal (in auto-set lang) → tutorial
  // Step C — fully set up: nothing
  if (!wcCountry) {
    setTimeout(() => openCountryPicker(() => {
      renderCountrySettingRow()   // country & language now set
      if (!userId) {
        setTimeout(() => openUserIdModal(() => {
          if (!tutorialDone) setTimeout(() => openTutorial(), 420)
        }, { mandatory: true }), 320)
      } else {
        if (!tutorialDone) setTimeout(() => openTutorial(), 420)
      }
    }, { mandatory: true }), 500)
  } else if (!userId) {
    setTimeout(() => openUserIdModal(() => {
      if (!tutorialDone) setTimeout(() => openTutorial(), 420)
    }, { mandatory: true }), 500)
  }
})
