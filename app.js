document.addEventListener('DOMContentLoaded', function() {
    
    const firebaseConfig = {
        apiKey: "AIzaSyDFsna0GyM7Kp4hzbElyj5RIA-JZBuVUOk",
        authDomain: "nubtk-semester-fee.firebaseapp.com",
        projectId: "nubtk-semester-fee",
        storageBucket: "nubtk-semester-fee.appspot.com", 
        messagingSenderId: "3656588597",
        appId: "1:3656588597:web:bafc699e662df5dbe1007c"
    };

    
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const firestore = firebase.firestore();
    const storage = firebase.storage();

    
    const splash = document.getElementById('splash');
    const terminalText = document.getElementById('terminalText');
    const authContainer = document.getElementById('authContainer');
    const mainContainer = document.getElementById('mainContainer');
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginMessage = document.getElementById('loginMessage');
    const signupMessage = document.getElementById('signupMessage');
    const searchInput = document.getElementById('searchInput');
    const profileBtn = document.getElementById('profileBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const profileModal = document.getElementById('profileModal');
    const closeProfileModal = document.getElementById('closeProfileModal');
    const updateProfilePic = document.getElementById('updateProfilePic');

    
    let paymentData = [];
    let charts = {};
    let lastModified = '';
    let chartRefreshInterval;
    let currentUser = null;
    let currentUserData = null;
    let searchTimeout = null; 

    
    const terminalLines = [
        "Loading assets...",
        "Initializing modules...",
        "Connecting to Firebase...",
        "Setting up authentication...",
        "Department of Computer Science & Engineering...",
        "Welcome to NUBTK CSE Payment Portal."
    ];
    let terminalIndex = 0;

    const animateTerminal = () => {
        if (terminalIndex < terminalLines.length) {
            terminalText.textContent = terminalLines[terminalIndex++];
            setTimeout(animateTerminal, 1000);
        } else {
            splash.style.display = 'none';
            checkAuthState();
        }
    };

    
    animateTerminal();

    
    function checkAuthState() {
        auth.onAuthStateChanged(user => {
            if (user) {
                
                currentUser = user;
                
                
                loadPaymentData().then(() => {
                    firestore.collection('students').doc(user.uid).get()
                        .then(doc => {
                            if (doc.exists) {
                                currentUserData = doc.data();
                                
                               
                                if (currentUserData.studentId) {
                                    const matchingStudent = findMatchingStudent(currentUserData.studentId);
                                    if (matchingStudent) {
                                        // Update user data with latest payment info if needed
                                        if (!currentUserData.name || currentUserData.name !== matchingStudent.name) {
                                            firestore.collection('students').doc(user.uid).update({
                                                name: matchingStudent.name
                                            }).then(() => {
                                                currentUserData.name = matchingStudent.name;
                                            }).catch(error => {
                                                console.error("Error updating user name:", error);
                                            });
                                        }
                                    }
                                }
                                
                                updateUIForLoggedInUser(user, currentUserData);
                                setupAutoRefresh();
                                addRefreshIndicator();
                            } else {
                                console.error("No user document found.");
                               
                                return firestore.collection('students').doc(user.uid).set({
                                    email: user.email,
                                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                                }).then(() => {
                                    currentUserData = { email: user.email };
                                    updateUIForLoggedInUser(user, currentUserData);
                                    setupAutoRefresh();
                                    addRefreshIndicator();
                                });
                            }
                        })
                        .catch(error => {
                            console.error("Error getting user document:", error);
                        });
                });
                
                authContainer.style.display = 'none';
                mainContainer.style.display = 'block';
            } else {
                
                authContainer.style.display = 'flex';
                mainContainer.style.display = 'none';
                currentUser = null;
                currentUserData = null;
            }
        });
    }

    
    function findMatchingStudent(studentId) {
        if (!studentId || !paymentData || !paymentData.length) return null;
        
        return paymentData.find(student => 
            student.id.toString() === studentId.toString()
        );
    }

    
    function updateUIForLoggedInUser(user, userData) {
        const userDisplayName = document.getElementById('userDisplayName');
        const userProfilePic = document.getElementById('userProfilePic');
        const modalProfilePic = document.getElementById('modalProfilePic');
        
       
        let matchingStudent = null;
        if (userData && userData.studentId) {
            matchingStudent = findMatchingStudent(userData.studentId);
        }
        
       
        userDisplayName.textContent = userData?.studentId || user.email || 'Student';
        
        
        if (user.photoURL) {
            userProfilePic.src = user.photoURL;
            modalProfilePic.src = user.photoURL;
        } else {
            
            userProfilePic.src = 'assets/default-profile.png';
            modalProfilePic.src = 'assets/default-profile.png';
        }
        
        
        if (matchingStudent) {
            document.getElementById('studentName').textContent = matchingStudent.name;
            document.getElementById('studentId').textContent = `Student ID: ${userData?.studentId || '--'}`;
            document.getElementById('studentEmail').textContent = `Email: ${user.email || '--'}`;
            
           
            document.getElementById('tuitionFee').textContent = formatCurrency(matchingStudent.tuitionFee);
            document.getElementById('totalPaid').textContent = formatCurrency(matchingStudent.receivedAmount);
            document.getElementById('currentDues').textContent = formatCurrency(matchingStudent.dues);
            document.getElementById('scholarshipAmount').textContent = formatCurrency(matchingStudent.scholarship);
            
            
            updateStudentPaymentChart(matchingStudent);
        } else {
            
            document.getElementById('studentName').textContent = userData?.name || 'Student';
            document.getElementById('studentId').textContent = `Student ID: ${userData?.studentId || '--'}`;
            document.getElementById('studentEmail').textContent = `Email: ${user.email || '--'}`;
            
            
            document.getElementById('tuitionFee').textContent = formatCurrency(0);
            document.getElementById('totalPaid').textContent = formatCurrency(0);
            document.getElementById('currentDues').textContent = formatCurrency(0);
            document.getElementById('scholarshipAmount').textContent = formatCurrency(0);
        }
    }

 
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.style.display = 'flex';
        signupForm.style.display = 'none';
        loginMessage.textContent = '';
        signupMessage.textContent = '';
    });

    signupTab.addEventListener('click', () => {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.style.display = 'flex';
        loginForm.style.display = 'none';
        loginMessage.textContent = '';
        signupMessage.textContent = '';
    });

    
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        loginMessage.textContent = 'Logging in...';
        loginMessage.className = 'auth-message';
        
        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                loginMessage.textContent = 'Login successful!';
                loginMessage.className = 'auth-message success';
                loginForm.reset();
            })
            .catch(error => {
                loginMessage.textContent = error.message;
                loginMessage.className = 'auth-message error';
            });
    });

  
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const studentId = document.getElementById('signupStudentId').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const profilePic = document.getElementById('profilePicture').files[0];
        
        
        if (!/^\d{11}$/.test(studentId)) {
            signupMessage.textContent = 'Student ID must be exactly 11 digits';
            signupMessage.className = 'auth-message error';
            return;
        }
        
        signupMessage.textContent = 'Creating account...';
        signupMessage.className = 'auth-message';
        
        
        loadPaymentData().then(() => {
            
            const matchingStudent = findMatchingStudent(studentId);
            
            auth.createUserWithEmailAndPassword(email, password)
                .then(userCredential => {
                    const user = userCredential.user;
                    
                    
                    return firestore.collection('students').doc(user.uid).set({
                        studentId: studentId,
                        email: email,
                        name: matchingStudent?.name || `Student ${studentId}`,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    }).then(() => {
                        
                        if (profilePic) {
                            return uploadProfilePicture(user, profilePic);
                        }
                        return user;
                    });
                })
                .then(() => {
                    signupMessage.textContent = 'Account created successfully!';
                    signupMessage.className = 'auth-message success';
                    signupForm.reset();
                    
                    
                    setTimeout(() => {
                        loginTab.click();
                    }, 1500);
                })
                .catch(error => {
                    signupMessage.textContent = error.message;
                    signupMessage.className = 'auth-message error';
                });
        });
    });

    
    function uploadProfilePicture(user, file) {
        return new Promise((resolve, reject) => {
            
            if (file.size > 1024 * 1024) {
                reject(new Error('Profile picture must be less than 1MB'));
                return;
            }
            
            const storageRef = storage.ref();
            const profilePicRef = storageRef.child(`profile_pics/${user.uid}`);
            
            profilePicRef.put(file)
                .then(snapshot => snapshot.ref.getDownloadURL())
                .then(downloadURL => {
                   
                    return user.updateProfile({
                        photoURL: downloadURL
                    }).then(() => {
                       
                        return auth.currentUser.reload().then(() => {
                           
                            const freshUser = auth.currentUser;
                            
                            if (freshUser.photoURL) {
                                const userProfilePic = document.getElementById('userProfilePic');
                                const modalProfilePic = document.getElementById('modalProfilePic');
                                
                                if (userProfilePic) userProfilePic.src = freshUser.photoURL;
                                if (modalProfilePic) modalProfilePic.src = freshUser.photoURL;
                            }
                            return freshUser;
                        });
                    });
                })
                .then(user => resolve(user))
                .catch(error => reject(error));
        });
    }

    
    logoutBtn.addEventListener('click', () => {
        auth.signOut().catch(error => {
            console.error('Error signing out:', error);
        });
    });

   
    profileBtn.addEventListener('click', () => {
        updateProfileData();
        profileModal.style.display = 'block';
    });

    closeProfileModal.addEventListener('click', () => {
        profileModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === profileModal) {
            profileModal.style.display = 'none';
        }
    });

   
    updateProfilePic.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 1024 * 1024) {
            alert('Profile picture must be less than 1MB');
            return;
        }
        
        if (currentUser) {
            const loadingMsg = document.createElement('div');
            loadingMsg.className = 'profile-loading-message';
            loadingMsg.textContent = 'Updating profile picture...';
            document.querySelector('.profile-card').appendChild(loadingMsg);
            
            uploadProfilePicture(currentUser, file)
                .then(() => {
                    if (loadingMsg) loadingMsg.remove();
                    alert('Profile picture updated successfully!');
                })
                .catch(error => {
                    if (loadingMsg) loadingMsg.remove();
                    console.error('Error updating profile picture:', error);
                    alert('Error updating profile picture: ' + error.message);
                });
        }
    });

    
    function updateProfileData() {
        if (!currentUser || !currentUserData) return;
        
        
        let matchingStudent = null;
        if (currentUserData.studentId) {
            matchingStudent = findMatchingStudent(currentUserData.studentId);
        }
        
        if (matchingStudent) {
            document.getElementById('studentName').textContent = matchingStudent.name;
            document.getElementById('tuitionFee').textContent = formatCurrency(matchingStudent.tuitionFee);
            document.getElementById('totalPaid').textContent = formatCurrency(matchingStudent.receivedAmount);
            document.getElementById('currentDues').textContent = formatCurrency(matchingStudent.dues);
            document.getElementById('scholarshipAmount').textContent = formatCurrency(matchingStudent.scholarship);
            
            
            updateStudentPaymentChart(matchingStudent);
        } else {
            
            document.getElementById('studentName').textContent = currentUserData.name || 'Student';
            document.getElementById('tuitionFee').textContent = formatCurrency(0);
            document.getElementById('totalPaid').textContent = formatCurrency(0);
            document.getElementById('currentDues').textContent = formatCurrency(0);
            document.getElementById('scholarshipAmount').textContent = formatCurrency(0);
        }
        
       
        const modalProfilePic = document.getElementById('modalProfilePic');
        if (currentUser.photoURL) {
            modalProfilePic.src = currentUser.photoURL;
        } else {
            modalProfilePic.src = 'assets/default-profile.png';
        }
    }

    
    function updateStudentPaymentChart(student) {
        const ctx = document.getElementById('studentPaymentHistoryChart').getContext('2d');
        
       
        
        const paymentHistory = [
            { month: 'Jan', amount: student.receivedAmount * 0.2 },
            { month: 'Feb', amount: student.receivedAmount * 0.3 },
            { month: 'Mar', amount: student.receivedAmount * 0.5 }
        ];
        
        if (charts.studentPayment) charts.studentPayment.destroy();
        
        charts.studentPayment = new Chart(ctx, {
            type: 'line',
            data: {
                labels: paymentHistory.map(item => item.month),
                datasets: [{
                    label: 'Payment History',
                    data: paymentHistory.map(item => item.amount),
                    backgroundColor: 'rgba(0, 255, 157, 0.2)',
                    borderColor: '#00ff9d',
                    borderWidth: 2,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Payment History',
                        color: '#00ff9d',
                        font: {
                            family: 'Courier New, monospace',
                            size: 14
                        }
                    }
                }
            }
        });
    }

  
    async function loadPaymentData() {
        try {
           
            const response = await fetch('payment.json');
            if (!response.ok) {
                throw new Error('Failed to load data');
            }
            
            const currentLastModified = response.headers.get('last-modified');
            
            if (currentLastModified === lastModified && paymentData.length > 0) {
                return false;
            }
            
            lastModified = currentLastModified;
            paymentData = await response.json();
            
            updateSummaryStats();
            document.getElementById('fileStatus').innerHTML = '100% - Semester fee deadline: 13/02/2025';
            document.getElementById('fileStatus').className = 'file-status success';
            
            return true;
        } catch (error) {
            console.error('Error loading data:', error);
            document.getElementById('fileStatus').innerHTML = 'Error loading data file';
            document.getElementById('fileStatus').className = 'file-status error';
            return false;
        }
    }

   
    async function checkForDataUpdates() {
        const dataChanged = await loadPaymentData();
        if (dataChanged && searchInput.value.trim()) {
            performSearch();
        }
        
        
        if (dataChanged && currentUser && currentUserData && currentUserData.studentId) {
            const matchingStudent = findMatchingStudent(currentUserData.studentId);
            if (matchingStudent) {
                updateUIForLoggedInUser(currentUser, currentUserData);
            }
        }
    }

    
    function setupAutoRefresh() {
        if (chartRefreshInterval) clearInterval(chartRefreshInterval);
        
        
        chartRefreshInterval = setInterval(() => {
            checkForDataUpdates();
            console.log('Charts and data refreshed at', new Date().toLocaleTimeString());
        }, 30 * 60 * 1000);
    }

   
    function addRefreshIndicator() {
        const statsContainer = document.querySelector('.stats-container');
        if (!statsContainer) return;
        
        const existingIndicator = document.querySelector('.refresh-indicator');
        if (existingIndicator) existingIndicator.remove();
        
        const indicator = document.createElement('div');
        indicator.className = 'refresh-indicator';
        indicator.innerHTML = `
            <span class="last-refresh">Last refresh: ${new Date().toLocaleTimeString()}</span>
            <span class="next-refresh-time"></span>
        `;
        statsContainer.parentNode.insertBefore(indicator, statsContainer);
        
        function updateRefreshIndicator() {
            const lastRefreshEl = document.querySelector('.last-refresh');
            const nextRefreshEl = document.querySelector('.next-refresh-time');
            
            if (lastRefreshEl) {
                lastRefreshEl.textContent = `Last refresh: ${new Date().toLocaleTimeString()}`;
            }
            
            if (nextRefreshEl) {
                const nextChartRefresh = new Date(Date.now() + 30 * 60 * 1000);
                nextRefreshEl.textContent = `Next chart refresh: ${nextChartRefresh.toLocaleTimeString()}`;
            }
        }
        
        
        const originalUpdateSummaryStats = updateSummaryStats;
        window.updateSummaryStats = function() {
            originalUpdateSummaryStats();
            updateRefreshIndicator();
        };
        
        updateRefreshIndicator();
    }

    
    function updateSummaryStats() {
        const totalDues = paymentData.reduce((sum, student) => sum + student.dues, 0);
        const totalReceived = paymentData.reduce((sum, student) => sum + student.receivedAmount, 0);
        
        updateCharts(totalDues, totalReceived);
    }

   
    function formatCurrency(amount) {
        return new Intl.NumberFormat('bn-BD', {
            style: 'currency',
            currency: 'BDT',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
    
    
    function showSearchLoading() {
        const results = document.getElementById("results");
        results.innerHTML = '<div class="search-loading">Searching...</div>';
    }

    
    function performSearch() {
        const input = searchInput.value.trim().toUpperCase();

        const filteredData = paymentData.filter(student => {
            const studentId = student.id.toString().toUpperCase();
            const studentName = student.name.toString().toUpperCase();
            return studentId.includes(input) || studentName.includes(input);
        });

        let html = '';
        if (filteredData.length > 0) {
            html = `<table class="results-table">
                <tr>
                    <th>Student ID</th>
                    <th>Student Full Name</th>
                    <th>Total Received</th>
                    <th>Scholar %</th>
                    <th>Credit Taken</th>
                    <th>Reg Fee</th>
                    <th>Tuition Fee</th>
                    <th>Scholarship</th>
                    <th>Others</th>
                    <th>Net Payable</th>
                    <th>Previous Dues</th>
                    <th>Total Payable</th>
                    <th>Received Amount</th>
                    <th>Status</th>
                </tr>`;

            filteredData.forEach(student => {
                const dueStatus = student.dues <= 0 ? 
                    '<span style="color: #00ff00">Paid</span>' : 
                    `<span style="color: #ff6384">Due: ${formatCurrency(student.dues)}</span>`;
                
                const scholarshipStyle = student.scholarship < 0 ? 'style="color: #ff6384"' : '';
                const othersStyle = student.others < 0 ? 'style="color: #ff6384"' : '';
                const previousDuesStyle = student.previousDues < 0 ? 'style="color: #ff6384"' : '';
                
                html += `
                <tr>
                    <td>${student.id}</td>
                    <td>${student.name}</td>
                    <td>${formatCurrency(student.totalReceived)}</td>
                    <td>${student.scholarshipPercentage}%</td>
                    <td>${student.creditsTaken}</td>
                    <td>${formatCurrency(student.regFee)}</td>
                    <td>${formatCurrency(student.tuitionFee)}</td>
                    <td ${scholarshipStyle}>${formatCurrency(student.scholarship)}</td>
                    <td ${othersStyle}>${formatCurrency(student.others)}</td>
                    <td>${formatCurrency(student.netPayable)}</td>
                    <td ${previousDuesStyle}>${formatCurrency(student.previousDues)}</td>
                    <td>${formatCurrency(student.totalPayable)}</td>
                    <td>${formatCurrency(student.receivedAmount)}</td>
                    <td>${dueStatus}</td>
                </tr>`;
            });

            html += '</table>';
        } else if (input) {
            html = '<p class="no-results">No matching records found</p>';
        }

        document.getElementById("results").innerHTML = html;
    }

   
    function searchStudent() {
        
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
       
        if (searchInput.value.trim()) {
            showSearchLoading();
        } else {
            document.getElementById("results").innerHTML = '';
        }
        
        
        searchTimeout = setTimeout(performSearch, 1000);
    }

   
    function updateCharts(totalDues, totalReceived) {
        Chart.defaults.color = '#00ff9d';
        Chart.defaults.borderColor = 'rgba(0, 255, 157, 0.1)';
        
        
        const ctx1 = document.getElementById('paymentsChart').getContext('2d');
        if (charts.payments) charts.payments.destroy();

        const recentPayments = paymentData.slice(0, 5);
        charts.payments = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: recentPayments.map(student => student.id),
                datasets: [{
                    label: 'Total Received',
                    data: recentPayments.map(student => student.receivedAmount),
                    backgroundColor: 'rgba(0, 255, 157, 0.2)',
                    borderColor: '#00ff9d',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Recent Payments Overview',
                        color: '#00ff9d',
                        font: {
                            family: 'Courier New, monospace',
                            size: 14
                        }
                    }
                }
            }
        });

        
        const ctx2 = document.getElementById('duesChart').getContext('2d');
        if (charts.dues) charts.dues.destroy();

        charts.dues = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ['Paid', 'Dues'],
                datasets: [{
                    data: [totalReceived, totalDues],
                    backgroundColor: [
                        'rgba(0, 255, 157, 0.2)',
                        'rgba(255, 99, 132, 0.2)'
                    ],
                    borderColor: [
                        '#00ff9d',
                        '#ff6384'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Overall Payment Status',
                        color: '#00ff9d',
                        font: {
                            family: 'Courier New, monospace',
                            size: 14
                        }
                    }
                }
            }
        });
    }

    
    searchInput.addEventListener("input", searchStudent);

    
    const style = document.createElement('style');
    style.innerHTML = `
        .search-loading {
            padding: 10px;
            color: #00ff9d;
            text-align: center;
            font-family: 'Courier New', monospace;
        }
        .profile-loading-message {
            margin-top: 10px;
            color: #00ff9d;
            text-align: center;
            font-family: 'Courier New', monospace;
        }
    `;
    document.head.appendChild(style);

    
    function checkProfileImageExists() {
        const img = new Image();
        img.onload = function() {
            
        };
        img.onerror = function() {
            
            console.warn("Default profile image not found! Using the placeholder in code.");
        };
        img.src = 'assets/default-profile.png';
    }

    
    loadPaymentData().then(() => {
        console.log('NUBTK System initialized');
        checkProfileImageExists();
    });
});
