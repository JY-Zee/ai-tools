const fs = require("fs");

const sourFilePath = "data.json";
const dictFir = "NoFlyZoneOrigin/";

async function main() {
  // 读取本地json文件

  const readData = () => {
    return new Promise((resolve) => {
      fs.readFile(sourFilePath, "utf8", function (err, data) {
        resolve(data);
      });
    });
  };

  const parsePolygonPoints = (polygon_points) => {
    if (!polygon_points) {
      return polygon_points;
    }

    // 缓存改变之后的数据
    const newPoints = [];

    if (polygon_points.length > 0) {
      polygon_points.forEach((points) => {
        // point = [  [ -90.15069409699998, 33.520769476000055 ],  [ -90.15069409699998, 33.520769476000055 ],  ]

        points.forEach((item) => {
          // item  [ -90.15069409699998, 33.520769476000055 ],
          newPoints.push({
            lng: item[0],
            lat: item[1],
          });
        });
      });
    }
    return newPoints;
  };

  const parseSubareas = (sub_areas = []) => {
    if (sub_areas === null || sub_areas.length === 0) {
      return sub_areas;
    }

    sub_areas.forEach((area) => {
      const { polygon_points = [] } = area;

      if (!polygon_points) {
        return;
      }

      const newPoints = parsePolygonPoints(polygon_points);

      // 修改源数据
      area.polygon_points = newPoints;
    });

    return sub_areas;
  };

  const parseData = (data) => {
    // 转换成json
    const origin = JSON.parse(data);

    // 各个国家保存的对象
    const all = {};

    // 保存各个数据的areas id
    const ids = [];

    let time = 0;

    origin.forEach((oneRequest) => {
      const { areas } = oneRequest;
      areas.forEach((oneArea) => {
        const { area_id, country: originCountry, polygon_points, sub_areas } = oneArea;

        // 转换 第一层 polygon_points
        oneArea.polygon_points = parsePolygonPoints(polygon_points);

        // 转换 polygon_points
        oneArea.sub_areas = parseSubareas(sub_areas);

        // 判断是否重复
        const existId = ids.filter((id) => id === area_id);
        if (existId.length > 0) {
          // 存在 不做处理
        } else {
          // 不存在，保存
          ids.push(area_id);

          // 大疆的国家 有一个命名为 Canada, 但是实际上是 CA， 因此需要转换

          let country = originCountry;
          if (originCountry === "Canada") {
            country = "CA";
            // 修改源数据
            oneArea.country = country;
          }

          //国家归类
          const countryAreaList = all[`${country}`];
          if (countryAreaList && countryAreaList.length > 0) {
            // todo
          } else {
            all[`${country}`] = [];
          }
          time = time + 1;
          all[`${country}`].push(oneArea);
        }
      });
    });

    console.log("正在保存各个国家的文件");
    // 保存各个国家的文件
    const entries = Object.entries(all);

    // 判断 dictFir 文件夹是否存在
    if (fs.existsSync(dictFir)) {
      // 存在则删除所有子文件（只删除文件，不递归删除子文件夹）
      const files = fs.readdirSync(dictFir);
      files.forEach((file) => {
        const filePath = `${dictFir}${file}`;
        // 判断是文件再删除（防止误删文件夹）
        if (fs.lstatSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      });
    } else {
      // 不存在则创建文件夹
      fs.mkdirSync(dictFir, { recursive: true });
    }

    entries.forEach((key, value) => {
      const fileName2 = key[0];
      const value2 = key[1];

      const fileName = dictFir + fileName2 + ".json";

      // 压缩大小相关
      const str = JSON.stringify(value2);

      fs.writeFileSync(fileName, str);
    });
  };

  const run = async () => {
    const data = await readData();
    parseData(data);
  };

  run();
}

main();
