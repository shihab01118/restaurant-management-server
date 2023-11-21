const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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
const userCollection = database.collection("users");
const paymentCollection = database.collection("payments");

// Auth Related api's
app.post("/api/v1/auth/jwt", async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "10h",
  });
  res.send({ token });
});

// middlewares
const verifyToken = (req, res, next) => {
  // console.log("inside verifytoken", req.headers.authorization);
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "unAuthorized access" });
  }
  const token = req.headers.authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unAuthorized access" });
    }
    req.decoded = decoded;
    // console.log(decoded);
    next();
  });
};

// use verifyAdmin after verifyToken
const verifyAdmin = async (req, res, next) => {
  const decodedEmail = req.decoded.email;
  const query = { email: decodedEmail };
  const user = await userCollection.findOne(query);
  const isAdmin = user?.role === "admin";
  if (!isAdmin) {
    return res.status(403).send({ message: "forbidden access" });
  }
  next();
};

// User Collection
app.get("/api/v1/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    console.log(req.headers);
    const result = await userCollection.find().toArray();
    res.send(result);
  } catch (error) {
    res.send(error.message);
  }
});

app.get("/api/v1/users/admin/:email", verifyToken, async (req, res) => {
  try {
    const userEmail = req.params.email;
    const decodedEmail = req.decoded.email;
    // console.log(userEmail, decodedEmail);
    if (userEmail !== decodedEmail) {
      return res.status(403).send({ message: "forbidden user" });
    }
    const query = { email: userEmail };
    const user = await userCollection.findOne(query);
    let admin = false;
    if (user) {
      admin = user.role === "admin";
    }
    res.send({ admin });
  } catch (error) {
    console.log(error);
    res.send(error.message);
  }
});

app.post("/api/v1/users", async (req, res) => {
  try {
    const user = req.body;

    const query = { email: user.email };
    const existingUser = await userCollection.findOne(query);

    if (existingUser) {
      return res.send({ message: "user already exists", insertedId: null });
    } else {
      const result = await userCollection.insertOne(user);
      res.send(result);
    }
  } catch (error) {
    res.send(error.message);
  }
});

app.patch(
  "/api/v1/users/admin/:id",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    } catch (error) {
      res.send(error.message);
    }
  }
);

app.delete("/api/v1/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await userCollection.deleteOne(query);
    res.send(result);
  } catch (error) {
    res.send(error.message);
  }
});

// Cart Collection
app.get("/api/v1/user/cart", async (req, res) => {
  try {
    const userEmail = req.query.email;
    const query = { email: userEmail };
    const result = await cartCollection.find(query).toArray();
    res.send(result);
  } catch (error) {
    res.send(error.message);
  }
});

app.post("/api/v1/user/cart", async (req, res) => {
  try {
    const cartItem = req.body;
    const result = await cartCollection.insertOne(cartItem);
    res.send(result);
  } catch (error) {
    res.send(error.message);
  }
});

app.delete("/api/v1/user/cart/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await cartCollection.deleteOne(query);
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

app.get("/api/v1/user/menus/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await menuCollection.findOne(query);
    res.send(result);
  } catch (error) {
    res.send(error.message);
  }
});

app.post("/api/v1/admin/menus", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const item = req.body;
    const result = await menuCollection.insertOne(item);
    res.send(result);
  } catch (error) {
    res.send(error.message);
  }
});

app.patch(
  "/api/v1/admin/menus/:id",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedMenu = {
        $set: {
          name: item?.name,
          price: item?.price,
          category: item?.category,
          recipe: item?.recipe,
        },
      };
      const result = await menuCollection.updateOne(filter, updatedMenu);
      res.send(result);
    } catch (error) {
      res.send(error.message);
    }
  }
);

app.delete("/api/v1/admin/menus/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await menuCollection.deleteOne(query);
    res.send(result);
  } catch (error) {
    res.send(error.message);
  }
});

// Payment related api's
app.get("/api/v1/user/payment/:email", verifyToken, async (req, res) => {
  const userEmail = req.params.email;
  const query = {email: userEmail};
  if (userEmail !== req.decoded.email) {
    return res.status(403).send({ message: "forbidden user" });
  }
  const result = await paymentCollection.find(query).toArray();
  res.send(result);
})

app.post("/api/v1/user/create-payment-intent", async (req, res) => {
  try {
    const { price } = req.body;
    const amount = parseInt(price * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      payment_method_types: ["card"],
    });
    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    res.send(error.message);
  }
});

app.post("/api/v1/user/payment", async (req, res) => {
  const payment = req.body;
  const paymentResult = await paymentCollection.insertOne(payment);
  // console.log("payment Info", payment);

  const query = {
    _id: {
      $in: payment.cartId.map((id) => new ObjectId(id)),
    },
  };
  const deleteResult = await cartCollection.deleteMany(query);

  res.send(deleteResult);
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
