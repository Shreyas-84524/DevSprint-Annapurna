import { query } from "./_generated/server";

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    // Fetch all relevant data
    const foodListings = await ctx.db.query("foodListings").collect();
    const foodRequests = await ctx.db.query("foodRequests").collect();
    const users = await ctx.db.query("users").collect();
    const monetaryDonations = await ctx.db.query("monetaryDonations").collect();

    // 1. Live information of donation
    const foodDonationsCount = foodListings.length;
    
    // 2. Live update of available and registered volunteer
    const volunteersCount = users.filter(u => u.role === "volunteer").length;
    
    // 3. Donations made by supporters
    const totalMonetaryDonations = monetaryDonations.reduce((acc, curr) => acc + curr.amount, 0);
    const monetaryDonationsList = monetaryDonations.map(d => ({ 
      donorName: d.donorName, 
      amount: d.amount,
      currency: d.currency
    }));

    // 4. Food reaching the needy people
    const foodDeliveredCount = foodListings.filter(f => 
      f.status === "delivered" || f.status === "donated_to_animals"
    ).length;
    
    // 5. Quantity of food asked by needy people
    const foodRequestedCount = foodRequests.length;

    // We can also return recent feeds to display a "live feed" UI
    const recentFoodDonations = foodListings.slice(-5).reverse();
    const recentFoodRequests = foodRequests.slice(-5).reverse();

    return {
      foodDonationsCount,
      volunteersCount,
      totalMonetaryDonations,
      monetaryDonationsList,
      foodDeliveredCount,
      foodRequestedCount,
      recentFoodDonations,
      recentFoodRequests
    };
  },
});
