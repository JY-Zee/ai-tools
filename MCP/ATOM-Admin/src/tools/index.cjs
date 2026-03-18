// 纬度和经度（latitude and longitude）
const fs = require("fs");
const moment = require("moment");

const getData = (lat, lon, bottomLat, bottomLon) => {
  return new Promise((resolve, reject) => {
    fetch(
      `https://flysafe-api.dji.com/api/qep/geo/feedback/areas/in_rectangle?ltlat=${lat}&ltlng=${lon}&rblat=${bottomLat}&rblng=${bottomLon}&zones_mode=flysafe_website&drone=dji-mini-4-pro&level=2`,
      {
        headers: {
          // "Authorization": "Basic Zmx5LXNhZmUtczM6Q3hMIVlHIWhQI3VHYWNBJA==",
          Cookie:
            "tfstk=go_ZXC45SPUaTlkQ59LqTeCRc-895Ey5mZ9XisfD1dvgMtac8sXVcG10Hoz2Ltp6fFfj0ovhdiGfshgmus5N3nF9hKvVhsj_Oza561Lvoqy7Pz1GCmNO3CvMsDVDiQp0Oh0F9Rjvo8w7Rth8QbTchT1bDefHpIRmodXD-eAXKAAcndxnKQRJoKXcnBYHaIomsqxg-2vpiEAcnEVFtpd2oKXDoW5nQqQlkvRXjWPxHRg4v7q6U1vEoqbgkhprWpdpTwrBXL1G-q00qC-wE1v3I6P48Hfv0Zhxun1G2tdlIA22Hw5hSgXudc9G4I550TVjXBtVWeJcSzhyKN5V8hIIIcAy7d-lS9c8N6-cYw81S-nRO6JM4esQvRtX7OSJehqLpt5eCtbwxAyBhg1CSHWud2Wv0ib6-N23zgPKHBA1yZIZnm-M9BJ7TWRxCTPFRQG84mnvYkOeF7F-mmDrYqiNWNixDHS2TLNl5; acw_tc=0a47319217647269875674262e4f529835fa4ffa9d2f692ed0f7c0cd1bcb8f; region=CN; lang=zh-CN; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%2219ae1f10915148f-0f305208499ab9-26061b51-3688960-19ae1f10916190f%22%2C%22first_id%22%3A%22%22%2C%22props%22%3A%7B%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTlhZTFmMTA5MTUxNDhmLTBmMzA1MjA4NDk5YWI5LTI2MDYxYjUxLTM2ODg5NjAtMTlhZTFmMTA5MTYxOTBmIn0%3D%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%22%2C%22value%22%3A%22%22%7D%2C%22%24device_id%22%3A%2219ae1f10915148f-0f305208499ab9-26061b51-3688960-19ae1f10916190f%22%7D; sajssdk_2015_cross_new_user=1; www_request_id=e88cc394-0362-471f-8ba7-add4624c45db",
        },
      },
    )
      .then((res) => res.json())
      .then((res) => {
        // console.log(res.data)
        const { areas } = res.data;
        if (areas && areas.length > 0) {
          resolve(res.data);
        } else {
          resolve(null);
        }
      })
      .catch((err) => {});
  });
};

const fun = async () => {
  const areas = [];

  let time = 0;

  // 固定名字
  const fileName = "data.json";

  fs.writeFileSync(fileName, "[]", "utf8");
  let fileContentList = [];

  // origin lat: 90, lon: -180

  // test lat: 30, lon: 100
  console.log(`${moment().format("YYYY-MM-DD HH:mm:ss")} - 开始爬取`);
  for (let lat = 90; lat >= -90; lat -= 2) {
    for (let lon = -180; lon <= 180; lon += 5) {
      // 计算右下角的经纬度
      let bottomLat = lat - 2;
      let bottomLon = lon + 5;

      // 确保不超出范围
      if (bottomLat < -90) {
        bottomLat = -90;
      }
      if (bottomLon > 180) {
        bottomLon = 180;
      }
      if (bottomLat < -90) {
        bottomLat = -90;
      }
      if (bottomLon < -180) {
        bottomLon = -180;
      }

      console.log(
        `${moment().format("YYYY-MM-DD HH:mm:ss")} - 开始爬取: ${lat}, ${lon}, ${bottomLat}, ${bottomLon}`,
      );
      const result = await getData(lat, lon, bottomLat, bottomLon);

      if (!result) {
        continue;
      }

      // 读取json文件
      try {
        fileContentList.push(result);
      } catch (err) {
        // 没有文件
      }

      time += 1;

      // 生成区域
      areas.push([lat, lon, bottomLat, bottomLon]);
    }
  }

  console.log(`${moment().format("YYYY-MM-DD HH:mm:ss")} - 爬取完成， 共${time}次`);

  fs.writeFileSync(fileName, JSON.stringify(fileContentList));

  console.log(`${moment().format("YYYY-MM-DD HH:mm:ss")} - 写入文件成功： ${fileName}`);
};

fun();
