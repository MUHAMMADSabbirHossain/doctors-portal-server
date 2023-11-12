const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nemryyd.mongodb.net/?retryWrites=true&w=majority`;

console.log(uri);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        const servicesCollection = client.db("doctors_portal").collection("services");
        const bookingCollection = client.db("doctors_portal").collection("bookings");

        app.get("/service", async (req, res) => {
            const query = {};
            const cursor = servicesCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
            // console.log(services);
        });

        // This is not the proper way to query
        // After learning more about mongodb. use aggregate lookup, pipeline, match, group
        app.get("/available", async (req, res) => {
            const date = req.query.date;

            // step 1: get all services
            const services = await servicesCollection.find().toArray();

            // step 2: get the booking of that day: output [{}, {}, {}]
            const query = { date: date };
            const booking = await bookingCollection.find(query).toArray();

            // step 3: for each service, 
            services.forEach(service => {
                // step 4: find bookings for the service. output: [{}, {}, {}]
                const serviceBookings = booking.filter(b => b.treatment === service.name);
                // step 5: select slots for the service Bookings: ["", "", "",""]
                const bookedSlots = serviceBookings.map(book => book.slot);
                // step 6: select those slots that are not in bookedSlots
                const available = service.slots.filter(slot => !bookedSlots.includes(slot));
                // step 7: set available to slots to make it easier
                service.slots = available;
            });

            res.send(services);
        });


        /* 
         * API Naming Convention
        * app.get("/booking") // get all booking in this collection. or get more then one or by filter
        * app.get("/booking/:id") // get a specific booking
        * app.post("/bookign") // add a new booking
        * app.patch("/booking/:id) //
        * app.delete("/booking/:id") //
        */

        app.post("/booking", async (req, res) => {
            const booking = req.body;
            const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient };
            const exists = await bookingCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists });
            };
            const result = await bookingCollection.insertOne(booking);
            return res.send({ success: true, result });
        });

    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get("/", (req, res) => {
    res.send("Hello From Doctor Portal.");
});

app.listen(port, () => {
    console.log(`Doctors Portal App listening on port: ${port}`);
});
