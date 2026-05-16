const mongoose = require('mongoose');

const uri = "mongodb+srv://vandanalodhi2005_db_user:Jlzywt2W0Y8m7AWL@cluster0.d6mm1s7.mongodb.net/smarteprintsolution";

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log("Connected to DB");
        
        // Let's find the HP Envy Photo 7975
        const db = mongoose.connection.db;
        const productsCollection = db.collection('products');
        
        // Find products with this text in their description
        const textToRemove = "wireless&nbsp;all-in-one&nbsp;printer,&nbsp;color&nbsp;photo&nbsp;printer,&nbsp;borderless&nbsp;photo&nbsp;printing,&nbsp;home&nbsp;printing&nbsp;solution,&nbsp;HP&nbsp;true-to-screen&nbsp;technology,&nbsp;photo-enhanced&nbsp;ink,&nbsp;automatic&nbsp;two-sided&nbsp;photo&nbsp;printing,&nbsp;mobile&nbsp;printing,&nbsp;print&nbsp;scan&nbsp;copy,&nbsp;dedicated&nbsp;photo&nbsp;tray,&nbsp;high-quality&nbsp;photo&nbsp;prints,&nbsp;intuitive&nbsp;touchscreen&nbsp;printer,&nbsp;ink&nbsp;optimization,&nbsp;everyday&nbsp;document&nbsp;printing";
        
        // Also the raw version without &nbsp;
        const rawText = "wireless all-in-one printer, color photo printer, borderless photo printing, home printing solution, HP true-to-screen technology, photo-enhanced ink, automatic two-sided photo printing, mobile printing, print scan copy, dedicated photo tray, high-quality photo prints, intuitive touchscreen printer, ink optimization, everyday document printing";
        
        // Let's get all products, then manually check and replace
        const products = await productsCollection.find({}).toArray();
        let updatedCount = 0;
        
        for (const p of products) {
            if (p.description && (p.description.includes(textToRemove) || p.description.includes(rawText) || p.description.includes("wireless"))) {
                // If it has this massive tag list inside a <p> tag, we remove it.
                // Or simply clear the description if that's all it was.
                let newDesc = p.description
                    .replace(new RegExp(`<p>${textToRemove}</p>`, 'g'), '')
                    .replace(new RegExp(`<p>${rawText}</p>`, 'g'), '')
                    .replace(textToRemove, '')
                    .replace(rawText, '');
                    
                // What if it just has parts of it? Let's just remove anything that matches this large block
                // Let's just do a regex replace for the <p> block the user pasted
                const regex1 = /<p>wireless(?:&nbsp;| )all-in-one(?:&nbsp;| )printer.*?<\/p>/gi;
                newDesc = newDesc.replace(regex1, '');
                
                await productsCollection.updateOne(
                    { _id: p._id },
                    { $set: { description: newDesc } }
                );
                console.log(`Updated product: ${p.title}`);
                updatedCount++;
            }
        }
        
        console.log(`Updated ${updatedCount} products.`);
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
