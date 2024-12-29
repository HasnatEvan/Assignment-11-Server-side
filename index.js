require("dotenv").config();
const express = require('express');
const cors = require('cors');
const jwt=require('jsonwebtoken')
const cookieParser=require('cookie-parser')
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

app.use(cors({
    origin:['http://localhost:5173',
        'https://volunteer-management-99706.web.app',
        'https://volunteer-management-99706.firebaseapp.com'
    ],
    credentials:true
}));
app.use(express.json());
app.use(cookieParser())


const verifyToken=(req,res,next)=>{
    const token=req.cookies?.token;
    // console.log('token inside the verifyToken',token)
    if(!token){
        return res.status(401).send({message:'unauthorized access'})
    }
    // verify the token
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRATE,(err,decoded)=>{
        if(err){
            return res.status(401).send({message:'authorized access'})
        }
        req.user=decoded
        next()
    })
   
}
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lbrnp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const volunteersCollection = client.db('volunteerManagement').collection('volunteers');
        const applicationsCollection = client.db('volunteerManagement').collection('applications');

// auth related apis
app.post('/jwt',(req,res)=>{
    const user=req.body
    const token=jwt.sign(user,process.env.ACCESS_TOKEN_SECRATE,{expiresIn:'2h'})

    res.cookie('token',token,{
        httpOnly:true,
        secure:process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    })
    .send({success:true})
    

})
app.post('/logout',(req,res)=>{
    res.clearCookie('token',{
        httpOnly:true,
        secure:process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    })
    .send({success:true})
})



        // POST new volunteer
        app.post('/volunteers', async (req, res) => {
            const newVolunteers = req.body;
            const result = await volunteersCollection.insertOne(newVolunteers);
            res.send(result);
        });
   
        // app.get('/volunteers',async(req,res)=>{
        //     const cursor=volunteersCollection.find();
        //     const result=await cursor.toArray();
        //     res.send(result)
        // })

        // GET all volunteers or volunteers by email
        app.get('/volunteers',   async (req, res) => {
            const email = req.query.email;

            if (email) {
                // Filtering by email
                const query = { organizerEmail: email };
                // console.log(req.cookies?.token)
                // if(req.user.email !==req.query.email){
                //     return res.status(403).send({message:'forbidden access'})
                // }
                try {
                    const result = await volunteersCollection.find(query).toArray();
                    if (result.length === 0) {
                        return res.status(404).send({ message: 'No volunteers found for the provided email.' });
                    }
                    return res.send(result);
                } catch (error) {
                    return res.status(500).send({ message: 'Error fetching volunteers', error });
                }
            } else {
                // Fetching all volunteers
                const cursor = volunteersCollection.find();
                const result = await cursor.toArray();
                return res.send(result);
            }
        });

        // GET volunteer by ID
        app.get('/volunteers/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await volunteersCollection.findOne(query);
            res.send(result);
        });

        // DELETE a volunteer post
        app.delete('/volunteers/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await volunteersCollection.deleteOne(query);
            res.send(result);
        });

        // PUT to update a volunteer post
        app.put('/volunteers/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateVolunteer = req.body;
            const volunteer = {
                $set: {
                    url: updateVolunteer.url,
                    postTitle: updateVolunteer.postTitle,
                    description: updateVolunteer.description,
                    category: updateVolunteer.category,
                    location: updateVolunteer.location,
                    volunteersNeeded: updateVolunteer.volunteersNeeded,
                    deadline: updateVolunteer.deadline
                }
            };
            const result = await volunteersCollection.updateOne(filter, volunteer, options);
            res.send(result);
        });


        // Handle getting urgent volunteer needs (sort by deadline)
        app.get('/volunteer-needs-now', async (req, res) => {
            try {
                const result = await volunteersCollection
                    .find({})
                    .sort({ deadline: 1 })
                    .limit(6)
                    .project({
                        url: 1,
                        postTitle: 1,
                        category: 1,
                        deadline: 1
                    })
                    .toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: 'Error fetching volunteer needs', error });
            }
        });

        // ./.......................................................................

        app.post('/applications', async (req, res) => {

            const newApplication = req.body;
            const find=await applicationsCollection.findOne
            const result = await applicationsCollection.insertOne(newApplication);
            res.send(result);
        });

        
        // GET all volunteers or volunteers by email
        app.get('/applications', verifyToken, async (req, res) => {
            const email = req.query.email;

            if (email) {
                // Filtering by email
                const query = {volunteerEmail: email };
                // console.log(req.cookies?.token)
                if(req.user.email !==req.query.email){
                    return res.status(403).send({message:'forbidden access'})
                }
                try {
                    const result = await applicationsCollection.find(query).toArray();
                    if (result.length === 0) {
                        return res.status(404).send({ message: 'No volunteers found for the provided email.' });
                    }
                    return res.send(result);
                } catch (error) {
                    return res.status(500).send({ message: 'Error fetching volunteers', error });
                }
            } else {
                // Fetching all volunteers
                const cursor = applicationsCollection.find();
                const result = await cursor.toArray();
                return res.send(result);
            }
        });
        app.get('/applications/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await applicationsCollection.findOne(query);
            res.send(result);
        });
        app.delete('/applications/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await applicationsCollection.deleteOne(query);
            res.send(result);
        });


    } finally {
        // Optional: close the client if needed (not required here as we are keeping it open)
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Volunteer management web is running');
});

app.listen(port, () => {
    console.log(`Volunteer management on port ${port}`);
});
