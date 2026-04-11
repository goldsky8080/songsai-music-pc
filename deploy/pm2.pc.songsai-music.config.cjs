module.exports = {
  apps: [
    {
      name: "songsai-music-pc",
      cwd: "/home/songs/services/songsai-music-pc",
      script: "npm",
      args: "run start -- --port 3000",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
