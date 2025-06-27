import { app } from "electron";
import { join } from "path";
import { DataTypes, Sequelize } from "sequelize";
import store from "../store";

let sequelize: Sequelize | null = null;
let currentDbPath = "";

const initializeModels = (instance: Sequelize) => {
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

  return { Profile, Group };
};

export const getDatabase = async () => {
  const storedDataPath = store.get("dataPath") || app.getPath("userData");
  const newDbPath = join(storedDataPath, "profile_data.db");

  if (sequelize && currentDbPath === newDbPath) {
    // Return existing connection if path hasn't changed
    return { sequelize, profilesPath: storedDataPath, ...initializeModels(sequelize) };
  }

  // Close existing connection if there is one
  if (sequelize) {
    await sequelize.close();
  }

  // Create a new connection
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: newDbPath,
    logging: false,
  });

  currentDbPath = newDbPath;

  // Sync database schema
  await sequelize.sync({ alter: true });

  console.log("Database connection re-established/updated at:", newDbPath);
  
  return { sequelize, profilesPath: storedDataPath, ...initializeModels(sequelize) };
};
