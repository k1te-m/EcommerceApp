const controller = require("../controller/controller");
var db = require("../models");
const passport = require("../config/passport");
const sequelize=require("sequelize");
const Op=sequelize.Op;
// If a user has at least this high accessLevel, then they are an admin
// The default access level for new uesers is 10
const ADMIN_LEVEL=100;

// Routes
// =============================================================
module.exports = function(app) {

// Sends the user to the page that allows for changes on one id product.
  app.get("/admin/:table/change/byId/:id", function(req,res){
    let table=req.params.table;
    db[`${table}`].findAll({
    where: {
      id: req.params.id
    }
  }).then(function(results){
    let item=(results[0].dataValues);
    if(req.user)  
    {
      let accessLevel=req.user.accessLevel;
      if(accessLevel>=ADMIN_LEVEL) admin=true; else admin=false;
        res.render("adminchangeid", { "item": item, admin, loggedIn:accessLevel});
    }
    else res.render("/login", {});
  });
});

  // Updates the table for the current product being viewed.
  app.post("/admin/:table/change/byId/:id", function(req,res){
    let table=req.params.table;
    let id=req.params.id;
    let value=req.body.value;
    let cat=req.body.cat;
    let body={ "id": id };
    body[cat]=value;
    db[`${table}`].update(
      body, {
      where: {
        "id": id
      }
    })
      .then(function() {
        res.json({ "value": true});
      });
  });

  // Sends the user to a page where all values for a given category can be changed.
  app.get("/admin/:table/change/:category", function(req,res){
    let table=req.params.table;
    let category=["id"];
    let newCategory=req.params.category;
    category.push(newCategory);
      db[`${table}`].findAll({
        attributes: category,
        }).then(function(results){
          let item=(results[0].dataValues);
          let newTable=[];
          for(let i=0; i < results.length; i++){
            newTable.push(results[i].dataValues);
          }
          if(req.user)
          {
            let accessLevel=req.user.accessLevel;
            if(accessLevel>=ADMIN_LEVEL) admin=true; else admin=false;
            res.render("adminchange", { "item": item, "table": newTable, admin, loggedIn:accessLevel});
          }
          else res.render("/login",{});
        });
  });

  //Takes the users input and updates the table in the database.
  app.post("/admin/:table/change/:category", function(req,res){
    let table=req.params.table;
    let category=req.params.category;
    let body={};
    body[category]=req.body.value;
    db[`${table}`].update(
      body, {
      where: {
        id: req.body.id
      }
    })
      .then(function() {
        res.json({ value: true});
      });

  });


  app.get("/api/products", function(req, res) {
    db.Product.findAll({}).then(function (dbProductData) {
      let products = [];
      for (let index = 0; index < dbProductData.length; index++) {
        products.push(dbProductData[index].dataValues);
      };
      res.json(products);
    })
  })




// ------------------------------------------
// ----              ~~~~~               ----
// ------------------------------------------
// --     Authentication code              --
// --       (Mostly just copied from the   --
// --            passport exaple)          --
// ------------------------------------------

// Using the passport.authenticate middleware with our local strategy.
  // If the user has valid login credentials, send them to the members page.
  // Otherwise the user will be sent an error
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // Sending back a password, even a hashed password, isn't a good idea
    res.json({
      username: req.user.username,
      id: req.user.id
    });
  });
  // Route for logging user out
  app.get("/logout", function(req, res) {
    req.logout();
    res.redirect("/");
  });
  // Route for getting some data about our user to be used client side
  app.get("/api/user_data", (req, res) => {
    if (!req.user) {
      // The user is not logged in, send back an empty object
      res.json({});
    } else {
      // Otherwise send back the user's email and id
      // Sending back a password, even a hashed password, isn't a good idea
      res.json({
        username: req.user.username,
        id: req.user.id
      });
    }
  });
  app.post("/admin/:table/add", function(req,res){
    let table=req.params.table;
    db[`${table}`].create(
      req.body
    ).then(function() {

        res.json({value: true});
      });

  });
  // Route for signing up a user. The user's password is automatically hashed and stored securely thanks to
  // how we configured our Sequelize User Model. If the user is created successfully, proceed to log the user in,
  // otherwise send back an error
  app.post("/api/signup", (req, res) => {
    db.User.create({
      username: req.body.username,
      password: req.body.password
    })
      .then(() => {
        res.redirect(307, "/api/login");
      })
      .catch(err => {
        console.log(err);
        res.status(401).json(err);
      });
  });

  app.post("/cart",function(req,res){
    let array=[];
    if(req.body.limitCart){
    for(let i=0; i< req.body.limitCart.length; i++){
      array.push(Number(req.body.limitCart[i]));
    }
    db.Product.findAll({
      where: {
        id: array
      }
    }).then(function(response){
      res.json(response);
    });}else{
      let accessLevel=0; if(req.user) accessLevel=req.user.accessLevel;
      if(accessLevel>=ADMIN_LEVEL) admin=true; else admin=false;
    res.render("cart",{admin, loggedIn:accessLevel});
    }
  });

  app.post("/order",function(req,res){
      let cart=req.body.id;
      cart=Number(cart);
      let id;
      if(!req.user){
        id=0;
      }else{
        id=req.user.id;
      }
      console.log(req.user);
        db.Order.create({
          "product_id": Number(cart),
          "user_id": Number(id)
        }).then( function(){
        res.end();
      });
    });

    // Counts the number of sales that occured each day for the past 14 days.
    app.get("/adminsales/Order", (req,res)=>{
        let count=0;
        let dates=[];
        let orderCount=[0,0,0,0,0,0,0,0,0,0,0,0,0,0];    
      for(let i=0; i< 14; i++){
        dates.push(new Date() - (i)*24 * 60 * 60 * 1000);
          db.Order.count({          
              where: {
                createdAt: {
                  [Op.lte]: new Date() - (i)*24 * 60 * 60 * 1000,
                  [Op.gt]: new Date() - (i+1)*24 * 60 * 60 * 1000,
                },
               },
             }).then( function(results){
               count++;
               orderCount[13-i]=results;
               if(count==14){
                 res.json({"orderCount": orderCount, "dates":dates});
               }
             })
    
        }
 
         

     });
    

};