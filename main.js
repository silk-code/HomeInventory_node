var express = require('express');
var app = express();
var nodemailer = require('nodemailer');
var mysql = require('mysql');
var session = require('express-session');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
	cookieName: 'session',
    secret: 'esnes ekam tnseod ti',
	resave: true,
    saveUninitialized: true
}));

app.set('view engine','pug');
app.use(express.static(__dirname + '/public'));
app.locals.basedir = '/';

var userMenu=[{path:'/about', name: 'About'},{path:'/show_items', name: 'My Pantry'},{path:'/show_perishables', name: 'My Perishables'},{path:'/add_item', name: 'Add Item'},{path:'/home', name: 'Home'}];
var guestMenu=[{path:'/about', name: 'About'}];
var userLogin=[{path:'log_out', name:'Log Out'}];
var guestLogin=[{path:'sign_in', name:'Log In'},{path:'sign_up', name:'Sign Up'}];

/*
Homepage
*/
app.get('/',function(req,res)
{
	if(req.session.loggedin){
		var menu=userMenu;
		var login=userLogin;
	}else{
		var menu=guestMenu;
		var login=guestLogin;
	}
	res.render('index', {title: 'Homepage', menuList:menu, loginList:login})
});

app.get('/about', function(req,res){
	if(req.session.loggedin){
		var menu=userMenu;
		var login=userLogin;
	}else{
		var menu=guestMenu;
		var login=guestLogin;
	}
	res.render('about',{title: 'About us',menuList:menu, loginList:login});
});

/*
Login
*/
app.get('/sign_in', function(req, res) {
	if(req.session.loggedin){
		var menu=userMenu;
		var login=userLogin;
	}else{
		var menu=guestMenu;
		var login=guestLogin;
	}
    res.render('sign_in', {title: 'Login', menuList:menu, loginList:login});
});

app.post('/sign_in',function(req,res){
	var username=req.body.username;
	var password=encrypt(req.body.password);
	
	if(username && password){
		var con = mysql.createConnection({
		host: "localhost",
		user: "root",
		password: "",
		database: "homeinventory"
		});
		var sql="SELECT * FROM `user` WHERE username='"+username+"' and encrPassword='"+password+"'";
		con.query(sql, function (error, results, fields) {
			if (error) {
				res.render('response', {title: 'Error', string: "We're having technical problems. Please wait until we resolve them. Thank you for you patience.", menuList:guestMenu, loginList:guestLogin});
			}else{
				if(results.length>0){
					req.session.loggedin=true;
					req.session.username=username;
					req.session.userID=results[0].userID;
					res.render('index', {title: 'Homepage',menuList:userMenu,loginList:userLogin});
					return;
				}
				res.render('index', {title: 'Homepage',menuList:guestMenu,loginList:guestLogin});
				return;
			}
		});
	}
	else{
		res.render('response', {title: 'Error', string: 'Please enter Username and Password', menuList:guestMenu, loginList:guestLogin});
	}
});


/*
Sign up
*/
app.get('/sign_up',function(req,res)
{
	res.render('sign_up', {title: 'Signing Up',menuList:guestMenu, loginList:guestLogin})
});

app.post('/sign_up', (req, res) => {
    
    addUser(req, res);

});

/*
Log out
*/
app.get('/log_out', function(req,res){
	req.session.loggedin=false;
	res.render('index', {title: 'Homepage', menuList:guestMenu, loginList:guestLogin});
});

/*
User's page
*/
app.get('/home',function(req,res){
	if(req.session.loggedin){
		res.render('home',{title: 'Home', username:req.session.username, userID:req.session.userID, menuList:userMenu, loginList:userLogin});
	}
	else{
		res.render('response', {title: 'Error', string: 'Please login to view this page',menuList:guestMenu, loginList:guestLogin});
	}
	
});
app.get('/update_password',function(req,res){
	res.render('update_user',{title:'Update Password',menuList:userMenu,loginList:userLogin, field:'password'});
});
app.get('/update_email',function(req,res){
	res.render('update_user',{title:'Update Email',menuList:userMenu,loginList:userLogin, field:'email'});
});
app.get('/update_name',function(req,res){
	res.render('update_user',{title:'Update Name',menuList:userMenu,loginList:userLogin, field:'name'});
});
app.post('/update_password',(req,res)=>{
	updateUser(req,res, 'encrpassword', encrypt(req.body.newValue));
});
app.post('/update_email',(req,res)=>{
	updateUser(req,res, 'email', req.body.newValue);
});
app.post('/update_name',(req,res)=>{
	updateUser(req,res, 'name', req.body.newValue);
});
/*
Add item to database
*/
app.get('/add_item',function(req,res)
{
	if(req.session.loggedin){
		res.render('add_item', {title: 'Add Item', menuList:userMenu,loginList:userLogin})
	}
	else{
		res.render('response', {title: 'Error', string: 'Please login to view this page',menuList:guestMenu, loginList:guestLogin});
	}
	
});

app.post('/add_item', (req, res) => {
    
    addItem(req, res);

});

/*
Update item
*/
app.post('/update_item', function(req,res){
	if(req.session.loggedin){
		try{
			var items = [];
			var sql = "SELECT useritem.itemID as 'itemID',item.description as 'name', category.description as 'category', location.description as 'location', qty, unit.description as 'unit', isPerishable, note FROM `useritem`"+
						"inner join item on useritem.itemID=item.itemID "+
						"inner join category on item.categoryID=category.categoryID "+
						"inner join location on useritem.locationID=location.locationID "+
						"inner join unit on unit.unitID=useritem.unitID "+
						"where userId="+req.session.userID+" and useritem.itemID="+req.body.itemID+' ' +
						"group by category.description";
			retrieveItems(items,res, sql, 'Update item','update_item');
		}
		catch(error){
			console.log('error with database.!');
		} 
	}
	else{
		res.render('response', {title: 'Error', string: 'Please login to view this page',menuList:guestMenu, loginList:guestLogin});
	}
});

app.post('/update_inventory', function(req,res)
{
	if(req.session.loggedin){
		updateItem(req,res);
	}
	else{
		res.render('response', {title: 'Error', string: 'Please login to view this page',menuList:guestMenu, loginList:guestLogin});
	}
	 
});

/*
Delete item
*/
app.post('/delete_item', (req, res) => {
	if(req.session.loggedin){
		deleteItem(req,res);
	}
	else{
		res.render('response', {title: 'Error', string: 'Please login to view this page',menuList:guestMenu, loginList:guestLogin});
	}
    
});

/*
Shows all items for the user
*/
app.get('/show_items',function(req,res)
{
	if(req.session.loggedin){
		try{
			var items = [];
			var sql = "SELECT useritem.itemID as 'itemID',item.description as 'name', category.description as 'category', "+
						"location.description as 'location', qty, unit.description as 'unit', isPerishable, note FROM `useritem`"+
						"inner join item on useritem.itemID=item.itemID "+
						"inner join category on item.categoryID=category.categoryID "+
						"inner join location on useritem.locationID=location.locationID "+
						"inner join unit on unit.unitID=useritem.unitID "+
						"where userId="+req.session.userID+" ";
			retrieveItems(items,res, sql, 'My pantry', 'show_items');
		}
		catch(error){
			console.log('error with database.!');
		} 
	}
	else{
		res.render('response', {title: 'Error', string: 'Please login to view this page',menuList:guestMenu, loginList:guestLogin});
	}
	
});

/*
Shows all items flagged as perishable
*/
app.get('/show_perishables',function(req,res)
{
	if(req.session.loggedin){
		try{
			var items = [];
			var sql = "SELECT useritem.itemID as 'itemID',item.description as 'name', category.description as 'category', location.description as 'location', qty, unit.description as 'unit', isPerishable, note FROM `useritem`"+
						"inner join item on useritem.itemID=item.itemID "+
						"inner join category on item.categoryID=category.categoryID "+
						"inner join location on useritem.locationID=location.locationID "+
						"inner join unit on unit.unitID=useritem.unitID "+
						"where userId="+req.session.userID+" and isPerishable=1 ";
			retrieveItems(items,res, sql, 'My perishables', 'show_items');
		}
		catch(error){
			console.log('error with database.!');
		}
	}
	else{
		res.render('response', {title: 'Error', string: 'Please login to view this page',menuList:guestMenu, loginList:guestLogin});
	}
	 
});

/*
Contact form
*/
app.get('/contact_us', (req, res) =>{
	if(req.session.loggedin){
		var menu=userMenu;
		var login=userLogin;
	}else{
		var menu=guestMenu;
		var login=guestLogin;
	}
    res.render('contact_form',{
        title: 'Contact us', menuList:menu, loginList:login
    });
 });

app.post('/contact_action', (req, res) => {
	if(req.session.loggedin){
		var menu=userMenu;
		var login=userLogin;
	}else{
		var menu=guestMenu;
		var login=guestLogin;
	}
    sendEmail(req.body.name, req.body.msg, req.body.email);
    res.render('response', {title: 'Confirmation', string: 'Success! We will contact you soon.',menuList:menu, LoginList:login});
});

var server=app.listen(3000,function() {});

function updateItem(req,res)
{
	var con = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "",
	database: "homeinventory"
	});

    con.connect(function(err){
        if(err){
			res.render('response', {title: 'Error', string: "We're having technical problems. Please wait until we resolve them. Thank you for you patience.", menuList:userMenu, loginList:userLogin});
			return;
		}
		var isPerishable=0;
		if(req.body.isPerishable=="Yes") isPerishable=1;
		var sql = "UPDATE `item` SET `categoryID`="+req.body.category+
				",`description`='"+req.body.name+"',`isPerishable`="+isPerishable+
				",`Note`='"+req.body.note+"' WHERE itemID="+req.body.itemID;
		con.query(sql, function (error, results, fields) {
			if (error) {
				res.render('response', {title: 'Error', string: "We're having technical problems. Please wait until we resolve them. Thank you for you patience.", menuList:userMenu, loginList:userLogin});
				return;
			}else{
				
				var sql2="update useritem set locationId="+req.body.location+",unitId="+req.body.unit+",qty="+req.body.qty+"WHERE itemID="+req.body.itemID;
				con.query(sql2, function (error, results, fields) {
					if (error) {
						res.render('response', {title: 'Error', string: "We're having technical problems. Please wait until we resolve them. Thank you for you patience.", menuList:userMenu, loginList:userLogin});
						return;
					}
				});
				res.render('response', {title: 'Confirmation', string: 'Success! Item is updated.', menuList:userMenu, loginList:userLogin});
			}
		});
	});
}

function deleteItem(req,res)
{
	var con = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "",
	database: "homeinventory"
	});

    con.connect(function(err){
        if(err) {
			res.render('response', {title: 'Error', string: "We're having technical problems. Please wait until we resolve them. Thank you for you patience.", menuList:userMenu, loginList:userLogin});
			return;
		}
		//not sensitive/very important information, delete from database completly
		var sql = "DELETE FROM `useritem` WHERE `useritem`.`itemID` = "+req.body.itemID;
		con.query(sql, function (error, results, fields) {
			if (error) {
				res.render('response', {title: 'Error', string: "We're having technical problems. Please wait until we resolve them. Thank you for you patience.", menuList:userMenu, loginList:userLogin});
				return;
			}else{
				var sql2="DELETE FROM `item` WHERE `item`.`itemID` = "+req.body.itemID;
				con.query(sql, function (error, results, fields) {
					if (error) {
						res.render('response', {title: 'Error', string: "We're having technical problems. Please wait until we resolve them. Thank you for you patience.", menuList:userMenu, loginList:userLogin});
						return;
					}else{
						res.render('response', {title: 'Confirmation', string: 'Success! Item is deleted.', menuList:userMenu,loginList:userLogin});
					}
				});
			}
		});
	});
}

function addItem(req, res ){
    var con = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "",
	database: "homeinventory"
	});
	var userId=req.session.userID;

    con.connect(function(err){
        if(err) {
			res.render('response', {title: 'Error', string: "We're having technical problems. Please wait until we resolve them. Thank you for you patience.", menuList:guestMenu, loginList:guestLogin});
			return;
		}
		var isPerishable=0;
		if(req.body.isPerishable=="Yes") isPerishable=1;
		
		//create item
		var itemSql= "insert into `item` (`categoryID`,`description`, `isPerishable`, `Note`) values ("+req.body.category+",'"+req.body.name+"',"+isPerishable+",'"+req.body.note+"')";
		con.query(itemSql, function (error, results, fields) {
            if (error) throw error;
		});
		var itemIdSql= "SELECT max(itemID) as 'id' FROM `item` ";
		con.query(itemIdSql, function (error, results, fields) {
			if (error) throw error;
			var itemId=results[0].id;
			var sql = "INSERT INTO `userItem` (`userID`,`itemID`, `locationID`, `qty`, `unitID`) VALUES ("+userId+","+itemId+","+req.body.location+","+req.body.qty+","+req.body.unit+ ")";
			con.query(sql, function (error, results, fields) {
				if (error){ 
					throw error;
					res.redirect('/add_item');
				}else{
					res.render('response', {title: 'Confirmation', string: 'Success! New item added.', menuList:userMenu,loginList:userLogin});
				}
			  });
		});	
		
    });
}

function addUser(req, res ){
    var con = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "",
	database: "homeinventory"
	});

    con.connect(function(err){
        if(err){
			res.render('response', {title: 'Error', string: "We're having technical problems. Please wait until we resolve them. Thank you for you patience.", menuList:guestMenu, loginList:guestLogin});
			return;
		}
		if(req.body.password===req.body.repPassword){
			var sql = "INSERT INTO `user`( `username`, `encrPassword`, `email`, `name`" + 
			") VALUES ('" + req.body.username+"',"+ encrypt(req.body.password) +",'" +  req.body.email + "','" +  req.body.name +"')";
			con.query(sql, function (error, results, fields) {
				if (error) {
					throw error;
					res.redirect('/sign_up');
				}
			});
			var userIdSql= "SELECT max(userID) as 'id' FROM `user` ";
			con.query(userIdSql, function(error,results,fields){
				if(error){
					throw error;
					res.redirect('/sign_up');
				}
				else{
					req.session.loggedin=true;
					req.session.username=req.body.username;
					req.session.userID=results[0].id;
					res.render('response', {title: 'Confirmation', string: "Success! Let's get inventoring!.", menuList:userMenu,loginList:userLogin});
				}
			});
		}
    });
}

function sendEmail(name, msg, email){
	var nodemailer = require('nodemailer');
	var transport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'homeinventory.contact@gmail.com',
            pass: 'ThisIsMyFirstWebSite'
        }
    });
    
    var mailOptions = {
        from: 'homeinventory.contact@gmail.com', 
        to: 'homeinventory.contact@gmail.com',
        subject: 'Contact Request', 
        text: 'Name: '+name+' requested contact at '+email+' with the following message: '+msg
    };
    
    transport.sendMail(mailOptions, function(error, info){
        if(error){
            console.log(error);
        }
    
        else {
            console.log('Email sent: ' + info.response);
        }
    });
}

function retrieveItems(items,res, sql, title, page){
	var con = mysql.createConnection({
		host: "localhost",
		user: "root",
		password: "",
		database: "homeinventory"
	});
	con.connect(function(err){
        if(err){
			res.render('response', {title: 'Error', string: "We're having technical problems. Please wait until we resolve them. Thank you for you patience.", menuList:guestMenu, loginList:guestLogin});
			return;
		}		
        con.query(sql, function(err, result, fields){
            if (err){
                console.log("error here");
                console.log("err");
                throw err;
            } 
            for(var i = 0; i < result.length; i++){
                var Item = {
					'itemID':result[i].itemID,
                    'name':result[i].name,
                    'category':result[i].category,
                    'location':result[i].location,
                    'qty':result[i].qty,
                    'unit':result[i].unit,
					'isPerishable':result[i].isPerishable,
					'note':result[i].note					
                }
                items.push(Item);
            }
            res.render(page, {
                title: title,
                list: items, menuList:userMenu, loginList:userLogin
            });
        });
    });
}


function updateUser(req,res, field, newValue){
	var con = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "",
	database: "homeinventory"
	});

    con.connect(function(err){
        if(err){
			res.render('response', {title: 'Error', string: "We're having technical problems. Please wait until we resolve them. Thank you for you patience.", menuList:userMenu, loginList:userLogin});
			return;
		}
		var sql = "UPDATE `user` SET `"+field+"`='"+newValue+"' WHERE userID="+req.session.userID;
		con.query(sql, function (error, results, fields) {
			if (error) {
				res.render('response', {title: 'Error', string: "We're having technical problems. Please wait until we resolve them. Thank you for you patience.", menuList:userMenu, loginList:userLogin});
				return;
			}else{
				res.render('response', {title: 'Confirmation', string: 'Success! Account is updated.', menuList:userMenu, loginList:userLogin});
			}
		});
	});
}
// NOT SECURE 
function encrypt(myString){
	return 'encr'+myString;
}