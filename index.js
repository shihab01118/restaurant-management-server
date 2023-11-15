const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());

// console.log(process.env.DB_USER);
// console.log(process.env.DB_PASS);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jcpqyde.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

const database = client.db("bistroDB");
const menuCollection = database.collection("menus");
const reviewCollection = database.collection("reviews");
const cartCollection = database.collection("cart");

// Cart Collection
app.post("/api/v1/user/cart", async (req, res) => {
  try {
    const cartItem = req.body;
    const result = await cartCollection.insertOne(cartItem);
    res.send(result);
  } catch (error) {
    res.send(error.message);
  }
});

// Menu Collection
app.get("/api/v1/user/menus", async (req, res) => {
  try {
    const result = await menuCollection.find().toArray();
    res.send(result);
  } catch (error) {
    res.send(error.message);
  }
});

// Review Collection
app.get("/api/v1/user/reviews", async (req, res) => {
  try {
    const result = await reviewCollection.find().toArray();
    res.send(result);
  } catch (error) {
    res.send(error.message);
  }
});

app.get("/", (req, res) => {
  res.send("Boss is running to restaurant");
});

app.listen(port, () => {
  console.log(`Bistro Boss is running on port: ${port}`);
});
