import https from "https";
https.get("https://docs.google.com/spreadsheets/d/1hf_lpXI6x3hBDfEHX8r8q15w6F3wtlzIABGibdpCMhg/export?format=csv&gid=1882488493", (res) => {
  if (res.statusCode > 300 && res.statusCode < 400 && res.headers.location) {
    https.get(res.headers.location, (res2) => {
      res2.on("data", (d) => {
        console.log(d.toString().split('\n')[0]);
        process.exit(0);
      });
    });
  } else {
    res.on("data", (d) => {
      console.log(d.toString().split('\n')[0]);
      process.exit(0);
    });
  }
});
