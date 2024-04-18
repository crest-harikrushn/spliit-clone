const { MongoClient } = require("mongodb");

const uri = "mongodb://localhost:27017/splitwise-prod";

const cleanup = async () => {
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    // Connect to the MongoDB server
    await client.connect();
    console.log("Connected to the database");

    const db = client.db();

    // Find all users and clear the 'settle' array in each user record
    const resultUsers = await db
      .collection("users")
      .updateMany({}, { $set: { settle: [] } });
    console.log(`Updated ${resultUsers.modifiedCount} user records`);

    // Clear all expenses
    const resultExpenses = await db.collection("expenses").deleteMany({});
    console.log(`Deleted ${resultExpenses.deletedCount} expense records`);

    console.log("Database cleaned up");
  } catch (err) {
    console.error("Error during cleanup:", err);
  } finally {
    // Ensure the client connection is closed
    await client.close();
    console.log("Database connection closed");
  }
};

const drop = async () => {
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  try {
    // Connect to the MongoDB server
    await client.connect();
    console.log("Connected to the database");

    const db = await client.db("splitwise-prod");

    // drop all collections
    await db.dropDatabase();
    console.log("Database Deleted:)");
  } catch (error) {
    console.error("Error during cleanup:", error);
  } finally {
    // Ensure the client connection is closed
    await client.close();
    console.log("Database connection closed");
  }
};

cleanup();
// drop();
