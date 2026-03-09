import { app } from "electron";
import { join } from "path";
import { DataTypes, Sequelize } from "sequelize";
import store from "../store";

let sequelize: Sequelize | null = null;
let currentDbPath = "";
let cachedModels: { Profile: any; Group: any } | null = null;
let isFirstInit = true;
let initPromise: Promise<any> | null = null;

const initializeModels = (instance: Sequelize) => {
  if (cachedModels) {
    return cachedModels;
  }

  const Profile = instance.define(
    "Profiles",
    {
      Id: { type: DataTypes.TEXT, primaryKey: true },
      Name: { type: DataTypes.TEXT, allowNull: false },
      ProfilePath: { type: DataTypes.TEXT },
      JsonData: { type: DataTypes.TEXT },
      GroupId: { type: DataTypes.INTEGER },
      S3Path: { type: DataTypes.TEXT },
      CreatedBy: { type: DataTypes.INTEGER },
      LastRunBy: { type: DataTypes.INTEGER },
      LastRunAt: { type: DataTypes.DATE },
    },
    {
      timestamps: true,
      createdAt: "CreatedAt",
      updatedAt: "UpdatedAt",
    }
  );

  const Group = instance.define(
    "Groups",
    {
      Id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      Name: { type: DataTypes.TEXT },
      Sort: { type: DataTypes.INTEGER },
      CreatedBy: { type: DataTypes.INTEGER },
    },
    {
      timestamps: true,
      createdAt: "CreatedAt",
      updatedAt: "UpdatedAt",
    }
  );

  Group.hasMany(Profile, { foreignKey: 'GroupId' });
  Profile.belongsTo(Group, { foreignKey: 'GroupId' });

  cachedModels = { Profile, Group };
  return cachedModels;
};

export const getDatabase = async () => {
  const storedDataPath = store.get("dataPath") || app.getPath("userData");
  const newDbPath = join(storedDataPath, "profile_data.db");

  if (sequelize && currentDbPath === newDbPath) {
    return { sequelize, profilesPath: storedDataPath, ...initializeModels(sequelize) };
  }

  // Mutex: reuse in-flight init promise to prevent concurrent connections
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      // Close existing connection if there is one
      if (sequelize) {
        try {
          await sequelize.close();
        } catch (e) {
          console.error("Error closing database:", e);
        }
        cachedModels = null;
      }

      // Create a new connection
      sequelize = new Sequelize({
        dialect: "sqlite",
        storage: newDbPath,
        logging: false,
      });

      currentDbPath = newDbPath;

      // Enable WAL mode for better concurrent read performance
      await sequelize.query("PRAGMA journal_mode=WAL;");

      // Only use alter on first init to create missing columns, then use sync without alter
      if (isFirstInit) {
        await sequelize.sync({ alter: true });
        isFirstInit = false;
      } else {
        await sequelize.sync();
      }

      console.log("Database connection established at:", newDbPath);

      return { sequelize, profilesPath: storedDataPath, ...initializeModels(sequelize) };
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
};

export const closeDatabase = async () => {
  if (sequelize) {
    try {
      await sequelize.close();
      console.log("Database connection closed");
    } catch (e) {
      console.error("Error closing database:", e);
    }
    sequelize = null;
    cachedModels = null;
    currentDbPath = "";
  }
};
