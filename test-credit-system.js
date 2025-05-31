import { db } from "./src/db/index";
import { creditService } from "./src/db/services";
import { authors, authorCreditBalances } from "./src/db/schema";

async function testCreditSystem() {
  console.log("🧪 Testing Credit System...");
  
  try {
    // Get a random author
    const [sampleAuthor] = await db.select().from(authors).limit(1);
    
    if (!sampleAuthor) {
      console.log("No authors found in database");
      return;
    }
    
    console.log(`📝 Testing with author: ${sampleAuthor.displayName} (${sampleAuthor.authorId})`);
    
    // Check current balance
    const currentBalance = await creditService.getAuthorCreditBalance(sampleAuthor.authorId);
    console.log(`💰 Current balance: ${currentBalance} credits`);
    
    // Check credit history
    const history = await creditService.getCreditHistory(sampleAuthor.authorId, 5);
    console.log(`📊 Credit history (last 5 entries):`);
    history.forEach(entry => {
      console.log(`  - ${entry.creditEventType}: ${entry.amount > 0 ? '+' : ''}${entry.amount} credits (${entry.createdAt.toISOString()})`);
    });
    
    // Test adding credits
    console.log(`\n🔄 Testing credit operations...`);
    await creditService.addCredits(sampleAuthor.authorId, 5, 'CreditPurchase');
    console.log(`✅ Added 5 credits via purchase`);
    
    // Check new balance
    const newBalance = await creditService.getAuthorCreditBalance(sampleAuthor.authorId);
    console.log(`💰 New balance: ${newBalance} credits`);
    
    // Test deducting credits
    const canAfford = await creditService.canAfford(sampleAuthor.authorId, 3);
    console.log(`🤔 Can afford 3 credits: ${canAfford}`);
    
    if (canAfford) {
      await creditService.deductCredits(sampleAuthor.authorId, 3, 'eBookGeneration');
      console.log(`✅ Deducted 3 credits for eBook generation`);
      
      const finalBalance = await creditService.getAuthorCreditBalance(sampleAuthor.authorId);
      console.log(`💰 Final balance: ${finalBalance} credits`);
    }
    
    // Show materialized view data
    console.log(`\n📊 Materialized view data:`);
    const [balanceView] = await db
      .select()
      .from(authorCreditBalances)
      .where(eq(authorCreditBalances.authorId, sampleAuthor.authorId));
    
    console.log(`  - Author ID: ${balanceView.authorId}`);
    console.log(`  - Total Credits: ${balanceView.totalCredits}`);
    console.log(`  - Last Updated: ${balanceView.lastUpdated.toISOString()}`);
    
  } catch (error) {
    console.error("❌ Error testing credit system:", error);
  }
}

testCreditSystem()
  .then(() => {
    console.log("\n✅ Credit system test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
