export type PortCoordinate = {
  name: string;
  lat: number;
  lng: number;
  aliases?: string[];
};

export const PORT_COORDINATES: PortCoordinate[] = [
  {
    name: "日照港",
    lat: 35.3694,
    lng: 119.5481,
    aliases: ["日照", "rizhao", "rizhao port"],
  },
  {
    name: "马迹山",
    lat: 30.704,
    lng: 122.097,
    aliases: ["马迹山港", "马迹山码头", "majishan", "majishan port"],
  },
  {
    name: "大连港",
    lat: 38.924,
    lng: 121.641,
    aliases: ["大连", "dalian", "dalian port"],
  },
  {
    name: "营口港",
    lat: 40.6667,
    lng: 122.2333,
    aliases: ["营口", "鲅鱼圈", "yingkou", "bayuquan"],
  },
  {
    name: "天津港",
    lat: 38.977,
    lng: 117.758,
    aliases: ["天津", "tianjin", "tianjin port"],
  },
  {
    name: "唐山港",
    lat: 39.204,
    lng: 119.003,
    aliases: ["唐山", "曹妃甸", "京唐港", "tangshan", "caofeidian"],
  },
  {
    name: "青岛港",
    lat: 36.067,
    lng: 120.382,
    aliases: ["青岛", "qingdao", "qingdao port"],
  },
  {
    name: "连云港",
    lat: 34.5967,
    lng: 119.1788,
    aliases: ["连云港港", "lianyungang"],
  },
  {
    name: "上海港",
    lat: 31.2304,
    lng: 121.4737,
    aliases: ["上海", "shanghai", "shanghai port"],
  },
  {
    name: "宁波舟山港",
    lat: 29.8683,
    lng: 121.544,
    aliases: ["宁波", "舟山", "宁波港", "舟山港", "ningbo", "zhoushan"],
  },
  {
    name: "福州港",
    lat: 26.0745,
    lng: 119.2965,
    aliases: ["福州", "fuzhou"],
  },
  {
    name: "厦门港",
    lat: 24.4798,
    lng: 118.0894,
    aliases: ["厦门", "xiamen"],
  },
  {
    name: "广州港",
    lat: 23.1291,
    lng: 113.2644,
    aliases: ["广州", "guangzhou", "guangzhou port"],
  },
  {
    name: "深圳港",
    lat: 22.5431,
    lng: 114.0579,
    aliases: ["深圳", "盐田", "蛇口", "shenzhen", "yantian", "shekou"],
  },
  {
    name: "湛江港",
    lat: 21.2707,
    lng: 110.3594,
    aliases: ["湛江", "zhanjiang"],
  },
  {
    name: "防城港",
    lat: 21.6869,
    lng: 108.3547,
    aliases: ["防城", "fangchenggang"],
  },
];

export function findPortCoordinate(portName?: string | null) {
  if (!portName) return null;

  const keyword = portName.trim().toLowerCase();

  if (!keyword) return null;

  return (
    PORT_COORDINATES.find((port) => {
      const name = port.name.toLowerCase();

      if (keyword === name) return true;
      if (keyword.includes(name)) return true;
      if (name.includes(keyword)) return true;

      return port.aliases?.some((alias) => {
        const normalizedAlias = alias.toLowerCase();
        return keyword === normalizedAlias || keyword.includes(normalizedAlias);
      });
    }) || null
  );
}