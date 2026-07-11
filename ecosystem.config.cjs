module.exports = {
  apps: [
    {
      name: "temperamap",
      script: "server.mjs",
      cwd: "/home/opc/temperamap",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "256M",
      autorestart: true,
      watch: false,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/home/opc/temperamap/logs/error.log",
      out_file: "/home/opc/temperamap/logs/out.log",
    },
  ],
};
