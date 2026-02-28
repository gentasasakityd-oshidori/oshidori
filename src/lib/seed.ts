/**
 * シードスクリプト: ダミーデータをSupabaseに投入
 *
 * 実行方法:
 *   npx tsx src/lib/seed.ts
 *
 * 前提:
 *   - .env.local に NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY が設定済み
 *   - マイグレーション（001_initial_schema.sql）が適用済み
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "環境変数 NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください"
  );
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey);

// ============================================
// シードデータ定義
// ============================================

const shops: Database["public"]["Tables"]["shops"]["Insert"][] = [
  {
    slug: "kuramae-yamato",
    name: "蔵前 手打ちそば やまと",
    owner_name: "山田太郎",
    area: "蔵前",
    category: "そば・うどん",
    description: "創業45年、三代続く手打ちそばの名店。",
    address: "東京都台東区蔵前3-1-1",
    phone: "03-1234-5678",
    hours: "11:00〜15:00 / 17:00〜21:00",
    holidays: "毎週月曜日",
    is_published: true,
  },
  {
    slug: "kiyosumi-lien",
    name: "清澄白河 ビストロ Lien",
    owner_name: "佐藤美咲",
    area: "清澄白河",
    category: "フレンチ",
    description: "パリの路地裏ビストロのような温かさを、清澄白河で。",
    address: "東京都江東区清澄2-5-3",
    phone: "03-2345-6789",
    hours: "11:30〜14:00 / 18:00〜22:00",
    holidays: "毎週水曜日",
    is_published: true,
  },
  {
    slug: "yoyogi-torishin",
    name: "代々木上原 炭火焼鳥 とり信",
    owner_name: "中村信一",
    area: "代々木上原",
    category: "焼鳥",
    description: "備長炭にこだわる、本格炭火焼鳥。",
    address: "東京都渋谷区上原1-22-5",
    phone: "03-3456-7890",
    hours: "17:00〜23:00",
    holidays: "毎週日曜・祝日",
    is_published: true,
  },
  {
    slug: "sangenjaya-mantra",
    name: "三軒茶屋 スパイスカレー MANTRA",
    owner_name: "高橋健太",
    area: "三軒茶屋",
    category: "その他",
    description: "インドとスリランカを旅して見つけた、自分だけのスパイス。",
    address: "東京都世田谷区三軒茶屋2-14-8",
    phone: "03-4567-8901",
    hours: "11:30〜15:00 / 18:00〜21:00",
    holidays: "不定休",
    is_published: true,
  },
  {
    slug: "kagurazaka-tsukishiro",
    name: "神楽坂 日本料理 つきしろ",
    owner_name: "月城紘子",
    area: "神楽坂",
    category: "和食",
    description: "季節を映す、一期一会の料理。",
    address: "東京都新宿区神楽坂4-2-1",
    phone: "03-5678-9012",
    hours: "17:00〜22:00",
    holidays: "毎週日曜・月曜",
    is_published: true,
  },
  {
    slug: "kuramae-koku",
    name: "蔵前 ベーカリー KOKU",
    owner_name: "小林穀",
    area: "蔵前",
    category: "パン",
    description: "国産小麦と自家製酵母だけで焼く、毎日のパン。",
    address: "東京都台東区蔵前4-8-2",
    phone: null,
    hours: "8:00〜18:00（売切次第終了）",
    holidays: "毎週火曜・水曜",
    is_published: true,
  },
];

// slug → stories のマッピング
const storiesBySlug: Record<
  string,
  Omit<Database["public"]["Tables"]["stories"]["Insert"], "shop_id">[]
> = {
  "kuramae-yamato": [
    {
      title: "祖父から受け継いだ石臼と、朝4時の仕込み",
      body: "毎朝4時に起きて、祖父の代から使い続けている石臼でそば粉を挽く。機械のほうが早いことはわかっている。でも、この石臼で挽いた粉には、機械では出せない風味がある。\n\n祖父がこの店を始めたのは昭和56年。当時、蔵前にはまだ多くの職人町が残っていた。「職人の町には、職人が打つそばがなきゃいけない」——それが祖父の口癖だった。\n\n父の代で一度、効率化のために電動の石臼に替えようとしたことがある。でも常連のお客さんが「味が変わった」と言った。たった一人のその声で、父は翌日には元の石臼に戻した。\n\n私が店を継いで10年。毎朝4時に起きるのは正直きつい。でも、石臼をゆっくり回しながらそば粉を挽いている時間が、一日の中で一番好きな時間だ。粉の香りが立ち上る瞬間、祖父と父と、同じ時間を過ごしている気がする。\n\n「おいしい」と言ってもらえることが一番嬉しい。でもそれ以上に、「なんか落ち着くね、この店」と言ってもらえると、祖父から受け継いだものがちゃんと伝わっているんだと思える。",
      summary:
        "毎朝4時、祖父から受け継いだ石臼でそば粉を挽く。効率より風味。三代続くこだわりが、「なんか落ち着くね」という言葉に変わる瞬間が、一番嬉しい。",
      status: "published",
      published_at: new Date().toISOString(),
    },
  ],
  "kiyosumi-lien": [
    {
      title: "パリの小さなビストロで学んだ「おばあちゃんの味」",
      body: "フランス料理というと敷居が高いイメージがあるかもしれない。でも私がパリで出会ったのは、近所のおばあちゃんが作るような、素朴で温かい料理だった。\n\n修業先のビストロは、パリ11区の路地裏にあった。シェフのマダム・デュポンは70歳を超えていたが、毎朝マルシェで野菜を選び、その日の気分でメニューを決めた。「レシピ？ そんなものはないわよ。素材と話すのよ」──彼女の口癖だった。\n\n帰国して清澄白河に店を構えたのは、この街の空気がパリ11区に似ていたから。倉庫をリノベしたカフェや、若い作家のギャラリーが点在する街並みに、マダムのビストロが重なった。\n\nうちのメニューは毎日変わる。朝、市場で出会った食材で作る。お客さんには「今日のおすすめは？」ではなく「今日は何があるの？」と聞いてもらいたい。その会話から始まる食事が、私の思い描くビストロの姿だ。",
      summary:
        "パリの路地裏で70歳のマダムに学んだのは、レシピではなく「素材と話す」こと。清澄白河で毎日メニューが変わるビストロを営む理由。",
      status: "published",
      published_at: new Date().toISOString(),
    },
  ],
  "yoyogi-torishin": [
    {
      title: "備長炭だけは、絶対に妥協しない理由",
      body: "焼鳥屋にとって炭は命。ガスのほうが温度管理は楽だけど、備長炭でじっくり焼いた鶏肉の、あの皮のパリッとした食感と中のジューシーさは、ガスでは絶対に出せない。\n\n紀州備長炭を使い始めて15年。最初は炭の扱いがわからなくて、何度も火傷した。先代の親方に「炭と友達になれ」と言われて意味がわからなかったけど、今ならわかる。炭には機嫌がある。湿度や気温で燃え方が変わる。その日の炭の状態を見て、焼き加減を調整する。\n\n鶏肉は、宮崎県の契約農家から直送してもらっている。銘柄鶏ではない。でも、餌にこだわり、運動させ、ストレスなく育てた鶏は、どんな銘柄鶏にも負けない旨味がある。農家さんの名前は中西さん。年に2回、必ず農場を訪ねる。\n\n「うまい焼鳥」を出すのは当たり前。その先にあるのは、炭と鶏と、作り手の気持ちが一体になる瞬間。その瞬間を目指して、今日も炭を起こす。",
      summary:
        "備長炭15年、火傷の数だけ「炭の機嫌」がわかるようになった。宮崎の農家・中西さんの鶏と、炭と、気持ちが一つになる瞬間を目指して。",
      status: "published",
      published_at: new Date().toISOString(),
    },
  ],
  "sangenjaya-mantra": [
    {
      title: "会社を辞めてインドへ。スパイスに人生を賭けた日",
      body: "30歳の誕生日に、IT企業を辞めた。「何をやりたいかわからない」まま飛び込んだインドで、路上のカレー屋台に衝撃を受けた。\n\nたった3種類のスパイスで、あんなに複雑な味が出せるのか。おばちゃんが石臼でスパイスを挽く姿は、まるで魔法使いのようだった。\n\n3ヶ月インドに滞在し、その後スリランカへ。現地の家庭を訪ね歩き、おばちゃんたちにカレーの作り方を教わった。レシピは教えてくれない。「見て覚えなさい」と。だから必死で見た。匂いを嗅いだ。手の動きを真似した。\n\n帰国後、三軒茶屋の6坪の物件で開業。最初の1年は赤字だった。でも、一人、また一人と「このカレー、他にない味だね」と言ってくれるお客さんが増えていった。\n\nスパイスは毎月インドから直輸入している。現地の農家と直接やりとりして、収穫時期を指定する。同じスパイスでも、収穫時期で香りがまるで違うから。",
      summary:
        "IT企業を30歳で辞め、インドの路上カレーに衝撃を受けた。3種のスパイスで生まれる複雑な味。現地のおばちゃんに「見て覚えなさい」と教わった日々。",
      status: "published",
      published_at: new Date().toISOString(),
    },
  ],
  "kagurazaka-tsukishiro": [
    {
      title: "「女に和食は無理だ」と言われた日から",
      body: "料理学校を卒業して最初に入った日本料理店で、親方に言われた。「女に和食は無理だ」と。\n\n悔しかった。でも、辞めなかった。誰よりも早く店に行き、誰よりも遅くまで残った。3年目に初めて刺身を引かせてもらえた時、手が震えた。\n\n独立したのは35歳。神楽坂の路地裏に8席だけの店を構えた。「つきしろ」は月の白い光のこと。派手さはないけれど、静かに照らすような料理を作りたいと思った。\n\nうちの料理は、引き算の料理。素材の味を最大限に引き出すために、余計なものを足さない。出汁は利尻昆布と本枯節だけ。調味料は塩と薄口醤油と味醂。それだけで十分、素材は語ってくれる。\n\n今でもたまに思い出す。「女に和食は無理だ」というあの言葉を。でも今は、あの言葉があったから今の自分がある、と思えるようになった。",
      summary:
        "「女に和食は無理だ」——その言葉を跳ね返すために包丁を握り続けた。神楽坂8席の「つきしろ」で、引き算の料理を作り続ける理由。",
      status: "published",
      published_at: new Date().toISOString(),
    },
  ],
  "kuramae-koku": [
    {
      title: "パン1個に3日かける理由を、誰も聞いてくれなかった",
      body: "うちのパンは、仕込みから焼き上がりまで3日かかる。自家製酵母の発酵に時間をかけるから。\n\n大手ベーカリーにいた頃は、イーストを使って3時間で焼いていた。効率は良い。でも、何か物足りなかった。自分で酵母を育て始めてわかった。時間をかけた分だけ、小麦の甘みが引き出される。\n\n蔵前に店を出して最初の1年、来るお客さんはみんな「おいしいね」と言ってくれた。嬉しかった。でも、3日かけている意味を聞いてくれる人はいなかった。\n\nそれでいい、味でわかってもらえれば、と思っていた。でも本音は、この3日間の工程を知ってほしかった。酵母が元気に泡立つ瞬間、生地が膨らんでいく過程、焼き上がりの香り——全部含めて、うちのパンだから。\n\n最近、常連さんが一人、「なんでこんなに時間かけてるの？」と聞いてくれた。嬉しくて、30分くらい話してしまった。",
      summary:
        "パン1個に3日。自家製酵母の発酵に時間をかける理由を誰も聞いてくれなかった。ある常連客の質問で、30分語ってしまった日。",
      status: "published",
      published_at: new Date().toISOString(),
    },
  ],
};

// slug → menus のマッピング
const menusBySlug: Record<
  string,
  Omit<Database["public"]["Tables"]["menus"]["Insert"], "shop_id">[]
> = {
  "kuramae-yamato": [
    {
      name: "もりそば",
      price: 850,
      description: "石臼挽き十割そば",
      kodawari_text: "つゆは本枯節と昆布の一番出汁",
      owner_message:
        "まずはこれだけを食べてほしい。祖父の石臼で挽いた十割そばを、何もつけずにひと口。小麦粉でごまかしていない、そば本来の甘みと香りがわかるはずです。つゆは本枯節と利尻昆布の一番出汁。そばをちょっとだけつけて、すすってください。45年間、毎朝4時に起きて守ってきた味です。",
    },
    {
      name: "鴨南蛮そば",
      price: 1600,
      description: "冬季限定・千葉県産合鴨使用",
      kodawari_text: "脂の甘みとそばの香りの調和",
      owner_message:
        "冬だけのお楽しみ。千葉の農家さんから直接仕入れる合鴨は、脂に甘みがあって、温かいそばつゆとの相性が抜群なんです。父の代から「冬はこれ」と決めている一品。寒い日に食べると、体だけじゃなく心まで温まる——そんなそばを目指しています。",
    },
  ],
  "kiyosumi-lien": [
    {
      name: "本日のランチコース",
      price: 2200,
      description: "前菜・メイン・デザート",
      kodawari_text: "毎朝市場で仕入れた食材で構成",
      owner_message:
        "メニューは毎日変わります。朝、築地の市場で「今日はこの子だ」と思った食材だけを買って帰ります。パリの師匠マダム・デュポンの口癖は「レシピなんてないわよ。素材と話すのよ」。だから私も、食材と相談しながらその日のコースを決めます。何が出るかは来てのお楽しみ。でも、ハズレはありません。",
    },
  ],
  "yoyogi-torishin": [
    {
      name: "レバー（塩）",
      price: 250,
      description: "朝〆レバーのレア焼き",
      kodawari_text: "備長炭で低温じっくり仕上げ",
      owner_message:
        "うちに来たら、まずこれを食べてほしい。朝〆の新鮮なレバーを、備長炭で低温でじっくり焼く。中はレアのトロッとした仕上がり。これが食べられるのは、宮崎の中西さんの鶏だからこそ。餌にこだわり、ストレスなく育った鶏のレバーは臭みがまったくない。塩だけで食べてみてください。レバーの概念が変わります。",
    },
    {
      name: "おまかせ8本コース",
      price: 2800,
      description: "その日の仕入れで構成する串8本",
      kodawari_text: "塩は粟国の塩、タレは継ぎ足し15年",
      owner_message:
        "迷ったらこれ。その日一番いい部位を8本選んで、塩とタレを交互にお出しします。塩は沖縄・粟国島の天然塩。タレは15年継ぎ足してきた秘伝のもの。順番にも意味があって、最初は淡白な部位から始めて、最後に脂の乗ったものへ。一本一本が、炭と鶏との真剣勝負です。",
    },
  ],
  "sangenjaya-mantra": [
    {
      name: "あいがけカレー",
      price: 1500,
      description: "日替わり2種のカレーを一皿で",
      kodawari_text: "インド直輸入スパイス、収穫時期指定",
      owner_message:
        "2種のカレーを一皿に盛って、少しずつ混ぜながら食べてほしい。右はスリランカ式のサラッとしたカレー、左はインド式のこってりしたカレー。混ぜるたびに味が変わる。最後の一口まで飽きない。スパイスはインドから毎月直輸入していて、収穫時期まで指定しています。同じクミンでも、6月に収穫したものと10月のものでは香りがまるで違うんです。インドの路上で衝撃を受けた「たった3種のスパイスで生まれる複雑さ」を、この一皿で感じてもらえたら。",
    },
  ],
  "kagurazaka-tsukishiro": [
    {
      name: "おまかせコース",
      price: 12000,
      description: "季節の食材を使った8品のコース",
      kodawari_text: "利尻昆布と本枯節のみの出汁",
      owner_message:
        "私の料理は「引き算」です。出汁は利尻昆布と本枯節だけ。調味料は塩と薄口醤油と味醂。それだけで十分、素材が語ってくれます。8品のコースは、その日の市場で出会った食材で構成します。春なら筍と初鰹、夏なら鱧と万願寺唐辛子。季節を食べる、ということを感じていただけたら。「女に和食は無理」と言われた日から、ずっとこの引き算の料理を磨いてきました。余計なものを足さない勇気——それが私の料理です。",
    },
  ],
  "kuramae-koku": [
    {
      name: "カンパーニュ",
      price: 680,
      description: "看板商品・3日間長時間発酵",
      kodawari_text: "北海道産「春よ恋」と自家製酵母",
      owner_message:
        "これがうちの看板です。北海道産小麦「春よ恋」と、自分で育てた酵母だけで焼いています。仕込みから焼き上がりまで3日。大手ベーカリーにいた頃はイーストで3時間だった。でも、3日かけて酵母にゆっくり働いてもらうと、小麦の甘みが全然違う。焼きたてをちぎって、まずは何もつけずに食べてみてください。噛むほどに甘みが広がるはずです。この3日間の工程を、いつか誰かに聞いてほしかった。",
    },
    {
      name: "クロワッサン",
      price: 380,
      description: "北海道産発酵バター27層",
      kodawari_text: "毎朝5時から成形",
      owner_message:
        "毎朝5時に起きて、一つずつ手で成形しています。北海道産の発酵バターを27層に折り込む。層の数が多すぎても少なすぎてもダメ。27層が、サクッとした食感とバターの香りのベストバランス。焼きたてを割ると、バターの香りがふわっと広がります。売り切れ次第終了なので、早めに来ていただけると嬉しいです。",
    },
  ],
};

// ============================================
// シード実行
// ============================================

async function seed() {
  console.log("🌱 シードデータの投入を開始...\n");

  // 既存データを削除（依存関係の順で）
  console.log("既存データを削除中...");
  await supabase.from("empathy_taps").delete().neq("id", "");
  await supabase.from("oshi_shops").delete().neq("id", "");
  await supabase.from("menus").delete().neq("id", "");
  await supabase.from("stories").delete().neq("id", "");
  await supabase.from("photo_requests").delete().neq("id", "");
  await supabase.from("interview_messages").delete().neq("id", "");
  await supabase.from("ai_interviews").delete().neq("id", "");
  await supabase.from("shops").delete().neq("id", "");
  console.log("✅ 既存データ削除完了\n");

  // shops を投入
  console.log("店舗データを投入中...");
  const { data: insertedShops, error: shopsError } = await supabase
    .from("shops")
    .insert(shops)
    .select();

  if (shopsError) {
    console.error("❌ 店舗データの投入に失敗:", shopsError);
    process.exit(1);
  }
  console.log(`✅ ${insertedShops.length}件の店舗を投入\n`);

  // slug → id のマッピングを作成
  const slugToId: Record<string, string> = {};
  for (const shop of insertedShops) {
    slugToId[shop.slug] = shop.id;
  }

  // stories を投入
  console.log("ストーリーデータを投入中...");
  const allStories: Database["public"]["Tables"]["stories"]["Insert"][] = [];
  for (const [slug, stories] of Object.entries(storiesBySlug)) {
    const shopId = slugToId[slug];
    if (!shopId) continue;
    for (const story of stories) {
      allStories.push({ ...story, shop_id: shopId });
    }
  }
  const { data: insertedStories, error: storiesError } = await supabase
    .from("stories")
    .insert(allStories)
    .select();

  if (storiesError) {
    console.error("❌ ストーリーデータの投入に失敗:", storiesError);
    process.exit(1);
  }
  console.log(`✅ ${insertedStories.length}件のストーリーを投入\n`);

  // menus を投入
  console.log("メニューデータを投入中...");
  const allMenus: Database["public"]["Tables"]["menus"]["Insert"][] = [];
  for (const [slug, menus] of Object.entries(menusBySlug)) {
    const shopId = slugToId[slug];
    if (!shopId) continue;
    for (const menu of menus) {
      allMenus.push({ ...menu, shop_id: shopId });
    }
  }
  const { data: insertedMenus, error: menusError } = await supabase
    .from("menus")
    .insert(allMenus)
    .select();

  if (menusError) {
    console.error("❌ メニューデータの投入に失敗:", menusError);
    process.exit(1);
  }
  console.log(`✅ ${insertedMenus.length}件のメニューを投入\n`);

  console.log("🎉 シードデータの投入が完了しました！");
  console.log("\n投入されたデータ:");
  for (const shop of insertedShops) {
    const storyCount = allStories.filter((s) => s.shop_id === shop.id).length;
    const menuCount = allMenus.filter((m) => m.shop_id === shop.id).length;
    console.log(
      `  📍 ${shop.name} (${shop.slug}) - ストーリー: ${storyCount}件, メニュー: ${menuCount}件`
    );
  }
}

seed().catch(console.error);
