import { useState, useEffect } from 'react';
import {
  View, Text, Animated, TouchableHighlight, TouchableOpacity, Alert
} from 'react-native';
import TransactionModal from '../transactionComponents/transactionModal'; // Import the modal component
import { SwipeListView } from 'react-native-swipe-list-view';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';

export default function TransactionScreen({ navigation }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [category, setCategory] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [type, setType] = useState('Expense'); //setting the default to say expense
  const [description, setDescription] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [expandedTransaction, setExpandedTransaction] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0); // set state for expense/income segmented control tab

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        // Step 1: Fetch transactions
        const response = await fetch('https://centsible-gahyafbxhwd7atgy.eastus2-01.azurewebsites.net/transactions/1'); // Use the correct API endpoint
        if (response.ok) {
          const data = await response.json();
          ('Fetched transactions:', data);  // Add this log to check the fetched data


          // Step 2: For each transaction, fetch the category name or set to 'Income' for income transactions
          const updatedTransactions = await Promise.all(data.map(async (transaction, index) => {
            try {
              // Check if it's an income or expense
              if (transaction.transactiontype === 'Income') {
                // For income, just set category to 'Income'
                return {
                  ...transaction,
                  category: 'Income',  // Set category name as "Income"
                  key: transaction.id,
                };
              } else if (transaction.transactiontype === 'Expense') {
                // For expense, fetch category name based on category ID
                const categoryResponse = await fetch(`https://centsible-gahyafbxhwd7atgy.eastus2-01.azurewebsites.net/budgetCategoryName/${transaction.budgetcategoryid}`);
                if (categoryResponse.ok) {
                  const categoryData = await categoryResponse.json();
                  return {
                    ...transaction,
                    category: categoryData.categoryname,
                    key: transaction.id  // Set fetched category name
                  };
                } else {
                  console.error(`Failed to fetch category for ID ${transaction.budgetcategoryid}`);
                  return {
                    ...transaction,
                    category: 'Unknown Category',  // Default category if failed
                    key: transaction.id || index.toString(),
                  };
                }
              } else {
                // If neither 'income' nor 'expense', return the transaction with 'Unknown Category'
                return {
                  ...transaction,
                  category: 'Unknown Category',
                  key: transaction.id || index.toString(),
                };
              }
            } catch (err) {
              console.error(`Error processing transaction for ID ${transaction.id}: `, err);
              return {
                ...transaction,
                category: 'Unknown Category',  // Default category if error
                key: transaction.id || index.toString(),
              };
            }
          }));

          // Step 3: Sort transactions by date
          const sortedTransactions = updatedTransactions.sort((a, b) => new Date(b.transactiondate) - new Date(a.transactiondate));
          setTransactions(sortedTransactions);
        } else {
          Alert.alert("Error", "Failed to fetch transactions.");
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
        Alert.alert("Error", "Something went wrong.");
      }
    };

    fetchTransactions();
  }, []);


  const handleAddTransaction = async () => {
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Please enter a valid amount.");
      return; // Don't proceed if the amount is invalid
    }

    const transactionDate = new Date(date);  // This is the local time from your state
    //console.log(transactionDate);
    const transactionDateISOString = transactionDate.toISOString();  // Convert to UTC ISO string
    //console.log(transactionDateISOString);

    const newTransaction = {
      appuserID: 1,  // Assuming this is hardcoded for now, adjust if needed
      dollaramount: parsedAmount.toFixed(2),  // Format the amount to two decimal places
      transactiontype: type,  // Assuming type is a variable holding transaction type (income, expense, etc.)
      budgetcategoryID: categoryId,  // Use the selected category ID
      optionaldescription: description,  // Optional description for the transaction
      transactiondate: transactionDateISOString
    };

    console.log("New Transaction (final):", newTransaction);

    //console.log(date);
    //console.log("New Transaction:", newTransaction);  // Log the new transaction to verify

    try {
      // Sending the transaction data to the server
      const response = await fetch('https://centsible-gahyafbxhwd7atgy.eastus2-01.azurewebsites.net/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTransaction),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Created Transaction with ID:', data.id);

        // Fetch the category name using the categoryId of the transaction
        let categoryName = 'Unknown Category';  // Default category name if fetch fails
        if (categoryId) {
          try {
            const categoryResponse = await fetch(`https://centsible-gahyafbxhwd7atgy.eastus2-01.azurewebsites.net/budgetCategoryName/${categoryId}`);
            if (categoryResponse.ok) {
              const categoryData = await categoryResponse.json();
              categoryName = categoryData.categoryname; // Use fetched category name
            } else {
              console.error(`Failed to fetch category for ID ${categoryId}`);
            }
          } catch (err) {
            console.error('Error fetching category name:', err);
          }
        }

        // Add the categoryName to the transaction data
        data.category = categoryName;
        const transactionWithId = {
          ...data,               // The returned data from backend (including id)
          key: data.id.toString(),  // Use the backend-generated id as the key for React (if needed)
        };
  
        // Update the transactions list with the new transaction
        //console.log(data);
        setTransactions(prevTransactions => {
          const updatedTransactions = [transactionWithId, ...prevTransactions]; // Add the new transaction at the beginning
          return updatedTransactions.sort((a, b) => new Date(b.transactiondate) - new Date(a.transactiondate));  // Sort by date descending
        });

        // Reset the form fields after successful transaction creation
        resetForm();
      } else {
        const responseText = await response.text();
        console.error('Error response:', responseText);  // Log the error response for debugging
        throw new Error('Failed to add transaction: ' + responseText);
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
      alert("Error creating transaction: " + error.message);
    }
  };

  const updateCurrentBalanceInDB = async (newBalance) => {
    try {
      const response = await fetch('https://centsible-gahyafbxhwd7atgy.eastus2-01.azurewebsites.net/currentBalance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: 1, // Assuming the user ID is hardcoded, replace this with dynamic user ID if needed
          newbalance: newBalance,
        }),
      });
      //console.log(newBalance);

      if (response.ok) {
        console.log('Balance updated successfully!');
      } else {
        const responseText = await response.text();
        console.error('Error updating balance:', responseText);
      }
    } catch (error) {
      console.error('Error updating balance in the database:', error);
    }
  };


  // Resets the form fields and closes the modal
  const resetForm = () => {
    setAmount('');
    setCategory('');
    setType('Expense');
    setDate(new Date());
    setDescription('');
    setSelectedIndex(0); //Resets to "Expense" (index 0)
    setModalVisible(false);
  };

  // handles switching expense/income tabs in transaction
  const handleIndexChange = (index) => {
    setSelectedIndex(index);
    if (index === 0) { setType('Expense') };
    if (index === 1) { setType('Income') };
  };

  const handleExpandTransaction = (transactionKey) => {
    // If the same transaction is clicked, collapse it, otherwise expand it
    setExpandedTransaction(prevKey => prevKey === transactionKey ? null : transactionKey);
  };

  // Update the balance when the transactions state changes
  useEffect(() => {
    const newBalance = calculateBalance();
    //console.log(newBalance);
    updateCurrentBalanceInDB(newBalance); // Update balance in DB whenever transactions change
  }, [transactions]); // This hook will run whenever the transactions state is updated

  // Calculate current balance
  const calculateBalance = () => {
    let balance = 0;

    // Calculate balance based on transactions
    transactions.forEach(transaction => {
      const amount = parseFloat(transaction.dollaramount);
      if (transaction.transactiontype === 'Income') {
        balance += amount;
      } else if (transaction.transactiontype === 'Expense') {
        balance -= amount;
      }
    });

    return balance.toFixed(2); // Return balance rounded to two decimal places
  };

  // Renders a single transaction item with correct layout 
  const TransactionItem = memo(({ data }) => {
    const options = {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    };
    const formattedDate = new Date(data.item.transactiondate).toLocaleDateString('en-US', options).replace(',', '');
    //console.log("Formatted Date:", formattedDate);
    const isExpanded = expandedTransaction === data.item.key;
    //console.log("TransactionKey:", data.item.key, "ExpandedKey:", expandedTransaction, "IsExpanded:", isExpanded);

    const formattedAmount = parseFloat(data.item.dollaramount).toFixed(2);
    const amountText = data.item.transactiontype === 'Income'
      ? `+$${formattedAmount}`
      : `-$${formattedAmount}`;

    return (
      <TouchableHighlight
        style={[styles.rowFrontVisible, { height: isExpanded ? 70 : 60 }]}  // Adjust height if expanded
        onPress={() => handleExpandTransaction(data.item.key)} // Toggle expansion on press
        underlayColor="#D3D3D3"
      >
        <View style={styles.itemContainer}>
          <View>
            <Text style={styles.dateText}>{formattedDate.toUpperCase()}</Text>
            {data.item.transactiontype === 'Income' ? (
              <Text style={[styles.categoryText, isExpanded && { paddingBottom: 0 }]}>Income</Text>
            ) : (
              <Text style={[styles.categoryText, isExpanded && { paddingBottom: 0 }]}>{data.item.category}</Text>
            )}
            {/* Render description if expanded */}
            {isExpanded && (
              <Text style={[styles.descriptionText, { paddingBottom: 8 }]}>
                {data.item.optionaldescription || "No description given"}
              </Text>
            )}
          </View>
          <Text style={[styles.amountText, { color: data.item.transactiontype === 'Income' ? 'green' : 'black' }]}>
            {amountText}
          </Text>
        </View>
      </TouchableHighlight>
    );
  });

  // Render function for individual transaction items
  const renderItem = (data) => {
    //console.log("Transactions:", transactions); // Verify if the state contains the new transaction
    //console.log(data.item.dollaramount);
    return (
      <TransactionItem data={data} />
    );
  };

  const closeRow = (rowMap, rowKey) => {
    if (rowMap[rowKey]) {
      rowMap[rowKey].closeRow();
    }
  };

  const deleteTransaction = async (rowMap, rowKey) => {
    closeRow(rowMap, rowKey); // Close the row before deletion

    // Find the transaction to delete in the local state
    const transactionToDelete = transactions.find(item => item.key === rowKey);
    if (!transactionToDelete) {
      alert("Transaction not found!");
      return;
    }

    try {
      // Make DELETE request to the backend
      const response = await fetch(`https://centsible-gahyafbxhwd7atgy.eastus2-01.azurewebsites.net/transactions/${transactionToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Parse the response
      const responseData = await response.json();

      if (response.ok) {
        // If deletion was successful, remove the transaction from the local state
        const newTransactions = transactions.filter(item => item.key !== rowKey);
        setTransactions(newTransactions);
      } else {
        // Handle server error
        Alert.alert("Error", responseData.message || "Failed to delete transaction.");
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      Alert.alert("Error", "Something went wrong while deleting the transaction.");
    }
  };

  const HiddenItemWithActions = ({ swipeAnimatedValue, onDelete, data }) => {
    const isExpanded = expandedTransaction === data.item.key;
    return (
      <View style={[styles.rowBack, { height: isExpanded ? 70 : 60 }]}>
        <TouchableOpacity style={[styles.trashBtn, { height: isExpanded ? 70 : 60 }]} onPress={onDelete}>
          <Animated.View
            style={[styles.trash, {
              transform: [{
                scale: swipeAnimatedValue.interpolate({
                  inputRange: [-90, -45],
                  outputRange: [1, 0],
                  extrapolate: 'clamp',
                }),
              },],
            },]}>
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={35}
              color="#fff"
            />
          </Animated.View>
        </TouchableOpacity>
      </View>
    )
  }

  // Render the hidden item when swiped
  const renderHiddenItem = (data, rowMap) => {
    return (
      <HiddenItemWithActions
        data={data}
        rowMap={rowMap}
        onDelete={() => deleteTransaction(rowMap, data.item.key)}
      />
    );
  }

  // Set headerRight option dynamically
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.addButton} // Adjust padding for placement
          onPress={() => setModalVisible(true)} // Show the modal when pressed
        >
          <MaterialCommunityIcons name="plus" size={30} color="white" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Balance Section */}
      <View style={styles.balanceContainer}>
        <Text style={styles.balanceText}>Current Balance:</Text>
        <Text style={styles.balanceAmount}>${calculateBalance()}</Text>
      </View>

      {/* Input Transaction Screen */}
      <TransactionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)} // Close the modal
        onAdd={handleAddTransaction} // Add transaction when modal submits
        amount={amount}
        setAmount={setAmount}
        category={category}
        setCategory={setCategory}
        setCategoryId={setCategoryId}  // Pass setCategoryId here
        categoryId={categoryId}        // Pass the current categoryId
        description={description}
        setDescription={setDescription}
        type={type}
        setType={setType}
        date={date}
        setDate={setDate}
        onRequestClose={() => setModalVisible(false)}
        selectedIndex={selectedIndex}
        handleIndexChange={handleIndexChange}
        resetForm={resetForm}
      />

      {/* Transaction Table */}
      <View style={styles.transactionTableContainer}>
        <SwipeListView
          data={transactions}
          renderItem={renderItem}
          renderHiddenItem={renderHiddenItem}
          rightOpenValue={-75}
          disableRightSwipe
        />
      </View>

    </View>
  );
}

const styles = {
  //entire screen 
  container: {
    backgroundColor: '#e8d0f4',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },

  //transaction table styles
  transactionTableContainer: {
    paddingHorizontal: 10,
    flex: 1,
    marginTop: 12,
    marginBottom: 12, // Add some bottom margin
  },
  rowFrontVisible: {
    backgroundColor: '#FFF',
    borderRadius: 5,
    marginBottom: 10,
    padding: 15,
    width: '100%', // Full width for the item
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    flex: 1,
  },
  dateText: {
    fontWeight: '500',
    paddingTop: 8,
    paddingBottom: 2, // Space between date and category
    fontSize: 16,
  },
  categoryText: {
    fontWeight: '500',
    color: '#777',
    fontSize: 16,
    paddingBottom: 8,
  },
  descriptionText: {
    fontSize: 15,
    color: '#888',  // Lighter color for description
    fontWeight: '300',  // Lighter weight
  },
  amountText: {
    fontWeight: 'bold',
    textAlign: 'right',
    fontSize: 16,
  },

  //styles for when you swipe on a transaction
  rowBack: {
    alignItems: 'center',
    backgroundColor: '#DDD',
    flexDirection: 'row',
    marginBottom: 5,
    borderRadius: 5,
    height: 50,
  },
  trashBtn: {
    alignItems: 'flex-end',
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    width: 75,
    paddingRight: 17,
    backgroundColor: 'red',
    right: 0,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    height: 50,
  },
  trash: {
    height: 35,
    width: 35,
    marginRight: 3,
  },

  //add transaction button
  addButton: {
    padding: 2,
    backgroundColor: 'purple',
    borderRadius: 5,
    marginRight: 16,
  },

  //current balance
  balanceContainer: {
    padding: 10,
    backgroundColor: 'purple',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    flexDirection: 'row',
    paddingLeft: 14,
    paddingRight: 14,
  },
  balanceText: {
    fontSize: 18,
    color: 'white', // Color for the text
    fontWeight: 'bold', // Adjust as needed
  },
  balanceAmount: {
    fontSize: 18,
    color: 'white', // Adjust based on how you want the amount to look
    fontWeight: 'bold',
  },
};