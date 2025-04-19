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
        "Department of CSE...",
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
        
        
        if (userData && userData.studentId) {
            
            const testImg = new Image();
            testImg.onload = function() {
                
                userProfilePic.src = `profiles/${userData.studentId}.png`;
                modalProfilePic.src = `profiles/${userData.studentId}.png`;
                console.log("Using student ID-based profile picture");
            };
            testImg.onerror = function() {
                
                if (user.photoURL) {
                    userProfilePic.src = user.photoURL;
                    modalProfilePic.src = user.photoURL;
                    console.log("Using photo URL from user object:", user.photoURL);
                } else if (userData && userData.photoURL) {
                    userProfilePic.src = userData.photoURL;
                    modalProfilePic.src = userData.photoURL;
                    console.log("Using photo URL from Firestore:", userData.photoURL);
                    
                    
                    user.updateProfile({
                        photoURL: userData.photoURL
                    }).catch(error => {
                        console.error("Error updating user profile with stored photoURL:", error);
                    });
                } else {
                    
                    userProfilePic.src = 'df.png';
                    modalProfilePic.src = 'df.png';
                    console.log("No profile picture found, using default");
                }
            };
            testImg.src = `profiles/${userData.studentId}.png`;
        } else {
            
            if (user.photoURL) {
                userProfilePic.src = user.photoURL;
                modalProfilePic.src = user.photoURL;
            } else if (userData && userData.photoURL) {
                userProfilePic.src = userData.photoURL;
                modalProfilePic.src = userData.photoURL;
            } else {
                userProfilePic.src = 'df.png';
                modalProfilePic.src = 'df.png';
            }
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
            initializePaymentNotes();
            loadPaymentNotes();
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
            .then((userCredential) => {
                const user = userCredential.user;
                
                
                if (!user.emailVerified) {
                    loginMessage.textContent = 'Please verify your email before logging in.';
                    loginMessage.className = 'auth-message warning';
                    
                    
                    const resendButton = document.createElement('button');
                    resendButton.textContent = 'Resend Verification Email';
                    resendButton.className = 'resend-button';
                    resendButton.onclick = function() {
                        user.sendEmailVerification().then(() => {
                            loginMessage.textContent = 'Verification email sent! Please check your inbox.';
                            loginMessage.className = 'auth-message success';
                        }).catch(error => {
                            loginMessage.textContent = error.message;
                            loginMessage.className = 'auth-message error';
                        });
                    };
                    
                    loginMessage.appendChild(document.createElement('br'));
                    loginMessage.appendChild(resendButton);
                    
                    
                    return auth.signOut();
                }
                
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
        const phoneNumber = document.getElementById('signupPhone').value;
        const bloodGroup = document.getElementById('signupBloodGroup').value;
        const profilePic = document.getElementById('profilePicture').files[0];
        
        
        if (!/^\d{11}$/.test(studentId)) {
            signupMessage.textContent = 'Student ID must be exactly 11 digits';
            signupMessage.className = 'auth-message error';
            return;
        }
        
        if (!phoneNumber) {
            signupMessage.textContent = 'Phone number is required';
            signupMessage.className = 'auth-message error';
            return;
        }
        
        if (!profilePic) {
            signupMessage.textContent = 'Profile picture is required';
            signupMessage.className = 'auth-message error';
            return;
        }
        
        signupMessage.textContent = 'Validating student ID...';
        signupMessage.className = 'auth-message';
        
        loadPaymentData().then(() => {
            
            const matchingStudent = findMatchingStudent(studentId);
            
            
            if (!matchingStudent) {
                signupMessage.textContent = 'Invalid Student ID. No matching record found.';
                signupMessage.className = 'auth-message error';
                return;
            }
            
           
            auth.createUserWithEmailAndPassword(email, password)
                .then(userCredential => {
                    const user = userCredential.user;
                    
                    
                    return user.sendEmailVerification().then(() => {
                        signupMessage.textContent = 'Verification email sent! Please check your inbox.';
                        signupMessage.className = 'auth-message success';
                        
                        
                        return firestore.collection('students').doc(user.uid).set({
                            studentId: studentId,
                            email: email,
                            phoneNumber: phoneNumber,
                            bloodGroup: bloodGroup,
                            name: matchingStudent.name || `Student ${studentId}`,
                            emailVerified: false,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        }).then(() => {
                            
                            signupMessage.textContent = 'Creating account and uploading profile picture...';
                            return uploadProfilePicture(user, profilePic);
                        });
                    });
                })
                .then(() => {
                    signupForm.reset();
                    signupMessage.textContent = 'Account created successfully! Please verify your email and login.';
                    signupMessage.className = 'auth-message success';
                    
                    
                    setTimeout(() => {
                        loginTab.click();
                    }, 3000);
                })
                .catch(error => {
                    signupMessage.textContent = error.message;
                    signupMessage.className = 'auth-message error';
                });
        });
    });

    
    function uploadProfilePicture(user, file) {
        return new Promise((resolve, reject) => {
            
            if (!file) {
                reject(new Error('Profile picture is required'));
                return;
            }
            
            if (file.size > 1024 * 1024) {
                reject(new Error('Profile picture must be less than 1MB'));
                return;
            }
            
            const storageRef = storage.ref();
            const profilePicRef = storageRef.child(`profile_pics/${user.uid}`);
            
            
            const loadingMsg = document.createElement('div');
            loadingMsg.className = 'profile-loading-message';
            loadingMsg.textContent = 'Uploading profile picture...';
            document.body.appendChild(loadingMsg);
            
            profilePicRef.put(file)
                .then(snapshot => {
                    console.log('Profile picture uploaded successfully!');
                    return snapshot.ref.getDownloadURL();
                })
                .then(downloadURL => {
                    console.log('Got download URL:', downloadURL);
                    
                    return user.updateProfile({
                        photoURL: downloadURL
                    }).then(() => {
                        console.log('User profile updated with new photo URL');
                        
                        return firestore.collection('students').doc(user.uid).update({
                            photoURL: downloadURL
                        }).catch(error => {
                            console.error("Error updating user document with photoURL:", error);
                            
                        });
                    });
                })
                .then(() => {
                    
                    return auth.currentUser.reload().then(() => {
                        
                        const freshUser = auth.currentUser;
                        console.log('Reloaded user:', freshUser);
                        
                        if (freshUser.photoURL) {
                            const userProfilePic = document.getElementById('userProfilePic');
                            const modalProfilePic = document.getElementById('modalProfilePic');
                            
                            if (userProfilePic) userProfilePic.src = freshUser.photoURL;
                            if (modalProfilePic) modalProfilePic.src = freshUser.photoURL;
                        }
                        
                        if (loadingMsg) loadingMsg.remove();
                        return freshUser;
                    });
                })
                .then(user => resolve(user))
                .catch(error => {
                    console.error('Error in profile picture upload:', error);
                    if (loadingMsg) loadingMsg.remove();
                    reject(error);
                });
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
            document.querySelector('.profile-info').appendChild(loadingMsg);
            
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

    function updateUserDocumentWithPhotoURL(uid, photoURL) {
        return firestore.collection('students').doc(uid).update({
            photoURL: photoURL
        }).catch(error => {
            console.error("Error updating user document with photo URL:", error);
        });
    }

    
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
            
            document.getElementById('totalReceived').textContent = formatCurrency(matchingStudent.totalReceived || matchingStudent.receivedAmount);
            document.getElementById('currentDues').textContent = formatCurrency(matchingStudent.dues);
            document.getElementById('scholarshipAmount').textContent = formatCurrency(matchingStudent.scholarship);
            document.getElementById('studentPhone').textContent = `Phone: ${currentUserData.phoneNumber || '--'}`;
            document.getElementById('studentBloodGroup').textContent = `Blood Group: ${currentUserData.bloodGroup || '--'}`;
            
            updateStudentPaymentChart(matchingStudent);
        } else {
            document.getElementById('studentName').textContent = currentUserData.name || 'Student';
            document.getElementById('tuitionFee').textContent = formatCurrency(0);
            document.getElementById('totalPaid').textContent = formatCurrency(0);
            
            document.getElementById('totalReceived').textContent = formatCurrency(0);
            document.getElementById('currentDues').textContent = formatCurrency(0);
            document.getElementById('scholarshipAmount').textContent = formatCurrency(0);
        }
        
        const modalProfilePic = document.getElementById('modalProfilePic');
        
        
        if (currentUserData && currentUserData.studentId) {
            const testImg = new Image();
            testImg.onload = function() {
                
                modalProfilePic.src = `profiles/${currentUserData.studentId}.png`;
                console.log("Using student ID-based profile picture in modal");
            };
            testImg.onerror = function() {
                
                if (currentUser.photoURL) {
                    modalProfilePic.src = currentUser.photoURL;
                    console.log("Using photo URL from user object in modal");
                } else if (currentUserData && currentUserData.photoURL) {
                    modalProfilePic.src = currentUserData.photoURL;
                    console.log("Using photo URL from Firestore in modal");
                } else {
                    
                    modalProfilePic.src = 'df.png';
                    console.log("No profile picture found for modal, using default");
                }
            };
            testImg.src = `profiles/${currentUserData.studentId}.png`;
        } else {
            
            if (currentUser.photoURL) {
                modalProfilePic.src = currentUser.photoURL;
            } else if (currentUserData && currentUserData.photoURL) {
                modalProfilePic.src = currentUserData.photoURL;
            } else {
                modalProfilePic.src = 'df.png';
            }
        }
    
        loadPaymentNotes();
    }

    
    function updateStudentPaymentChart(student) {
        const ctx = document.getElementById('totalReceivedChart').getContext('2d');
        
       
        
        const totalReceived = student.totalReceived || student.receivedAmount || 0;
        
        
        
        const totalFee = student.totalPayable || (totalReceived + student.dues);
        const paymentRate = totalReceived / 5; 
        
        const paymentHistory = [
            { month: 'Initial', amount: 0 },
            { month: 'Payment 1', amount: paymentRate },
            { month: 'Payment 2', amount: paymentRate * 2 },
            { month: 'Payment 3', amount: paymentRate * 3 },
            { month: 'Payment 4', amount: paymentRate * 4 },
            { month: 'Current', amount: totalReceived }
        ];
        
        
        const targetLine = paymentHistory.map(() => totalFee);
        
        if (charts.studentPayment) charts.studentPayment.destroy();
        
        charts.studentPayment = new Chart(ctx, {
            type: 'line',
            data: {
                labels: paymentHistory.map(item => item.month),
                datasets: [
                    {
                        label: 'Payment Progress',
                        data: paymentHistory.map(item => item.amount),
                        backgroundColor: 'rgba(0, 255, 157, 0.2)',
                        borderColor: '#00ff9d',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Total Payable',
                        data: targetLine,
                        borderColor: 'rgba(255, 99, 132, 0.7)',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Payment Progress',
                        color: '#00ff9d',
                        font: {
                            family: 'Courier New, monospace',
                            size: 14
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.raw || 0;
                                return label + ': ' + formatCurrency(value);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 255, 157, 0.1)'
                        },
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value).split('.')[0]; 
                            }
                        }
                    }
                }
            }
        });
    }
    
    
function initializePaymentNotes() {
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    const noteAmount = document.getElementById('noteAmount');
    const noteDate = document.getElementById('noteDate');
    const noteText = document.getElementById('noteText');
    const paymentNotesList = document.getElementById('paymentNotesList');
    
    let currentEditingNoteId = null;
    
    
    noteDate.valueAsDate = new Date();
    
    
    saveNoteBtn.addEventListener('click', () => {
        if (!currentUser) return;
        
        const amount = parseFloat(noteAmount.value);
        const date = noteDate.value;
        const text = noteText.value.trim();
        
        if (isNaN(amount) || amount <= 0 || !date || !text) {
            alert('Please fill in all fields correctly');
            return;
        }
        
        const noteData = {
            amount: amount,
            date: date,
            text: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const notesRef = firestore.collection('students').doc(currentUser.uid).collection('paymentNotes');
        
        if (currentEditingNoteId) {
           
            notesRef.doc(currentEditingNoteId).update(noteData)
                .then(() => {
                    resetNoteForm();
                    loadPaymentNotes();
                })
                .catch(error => {
                    console.error("Error updating note:", error);
                    alert('Error updating note: ' + error.message);
                });
        } else {
            
            notesRef.add(noteData)
                .then(() => {
                    resetNoteForm();
                    loadPaymentNotes();
                })
                .catch(error => {
                    console.error("Error adding note:", error);
                    alert('Error adding note: ' + error.message);
                });
        }
    });
    
    
    function resetNoteForm() {
        noteAmount.value = '';
        noteDate.valueAsDate = new Date();
        noteText.value = '';
        saveNoteBtn.textContent = 'Save Note';
        saveNoteBtn.parentElement.classList.remove('edit-mode');
        currentEditingNoteId = null;
    }
    
    
    function loadPaymentNotes() {
        if (!currentUser) return;
        
        const notesRef = firestore.collection('students').doc(currentUser.uid).collection('paymentNotes');
        
        notesRef.orderBy('timestamp', 'desc').get()
            .then(snapshot => {
                paymentNotesList.innerHTML = '';
                
                if (snapshot.empty) {
                    paymentNotesList.innerHTML = '<p class="no-notes">No payment notes yet. Add your first note!</p>';
                    return;
                }
                
                snapshot.forEach(doc => {
                    const noteData = doc.data();
                    const noteId = doc.id;
                    
                    const formattedAmount = formatCurrency(noteData.amount);
                    const formattedDate = new Date(noteData.date).toLocaleDateString('en-GB');
                    
                    const noteCard = document.createElement('div');
                    noteCard.className = 'note-card';
                    noteCard.dataset.noteId = noteId;
                    
                    noteCard.innerHTML = `
                        <div class="note-amount">${formattedAmount}</div>
                        <div class="note-date">${formattedDate}</div>
                        <div class="note-text">${noteData.text}</div>
                        <div class="note-actions">
                            <button class="edit-note" title="Edit note">✏️</button>
                            <button class="delete-note" title="Delete note">🗑️</button>
                        </div>
                    `;
                    
                    
                    noteCard.querySelector('.edit-note').addEventListener('click', () => {
                        currentEditingNoteId = noteId;
                        noteAmount.value = noteData.amount;
                        noteDate.value = noteData.date;
                        noteText.value = noteData.text;
                        saveNoteBtn.textContent = 'Update Note';
                        saveNoteBtn.parentElement.classList.add('edit-mode');
                        
                       
                        saveNoteBtn.scrollIntoView({ behavior: 'smooth' });
                    });
                    
                    
                    noteCard.querySelector('.delete-note').addEventListener('click', () => {
                        if (confirm('Are you sure you want to delete this note?')) {
                            notesRef.doc(noteId).delete()
                                .then(() => {
                                    loadPaymentNotes();
                                    if (currentEditingNoteId === noteId) {
                                        resetNoteForm();
                                    }
                                })
                                .catch(error => {
                                    console.error("Error deleting note:", error);
                                    alert('Error deleting note: ' + error.message);
                                });
                        }
                    });
                    
                    paymentNotesList.appendChild(noteCard);
                });
            })
            .catch(error => {
                console.error("Error loading notes:", error);
                paymentNotesList.innerHTML = '<p class="no-notes error">Error loading notes. Please try again.</p>';
            });
    }
    
    
    window.loadPaymentNotes = loadPaymentNotes;
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
        
        
        const bloodGroupPattern = /^(A|B|AB|O)[+-]$/i;
        const isBloodGroupSearch = bloodGroupPattern.test(input);
        
        if (isBloodGroupSearch) {
            
            searchByBloodGroup(input);
        } else {
            
            const filteredData = paymentData.filter(student => {
                const studentId = student.id.toString().toUpperCase();
                const studentName = student.name.toString().toUpperCase();
                return studentId.includes(input) || studentName.includes(input);
            });
    
            displaySearchResults(filteredData);
        }
    }
    
    function searchByBloodGroup(bloodGroup) {
        if (!firebase.auth().currentUser) {
            document.getElementById("results").innerHTML = '<p class="no-results">You must be logged in to search by blood group</p>';
            return;
        }
        
        document.getElementById("results").innerHTML = '<div class="search-loading">Searching for blood group donors...</div>';
        
        const db = firebase.firestore();
        db.collection('students')
            .where('bloodGroup', '==', bloodGroup.toUpperCase())
            .get()
            .then(snapshot => {
                if (snapshot.empty) {
                    document.getElementById("results").innerHTML = '<p class="no-results">No donors found with blood group ' + bloodGroup + '</p>';
                    return;
                }
                
                let html = `<table class="results-table" style="width: 100%;">
                    <tr>
                        <th>Profile</th>
                        <th>Student ID</th>
                        <th>Student Name</th>
                        <th>Blood Group</th>
                        <th>Phone Number</th>
                    </tr>`;
                    
                snapshot.forEach(doc => {
                    const userData = doc.data();
                    html += `
                    <tr>
                        <td><img src="profiles/${userData.studentId}.png" alt="Profile" class="search-result-profile-pic" onerror="this.src='df.png'"></td>
                        <td>${userData.studentId || '--'}</td>
                        <td>${userData.name || '--'}</td>
                        <td>${userData.bloodGroup}</td>
                        <td>${userData.phoneNumber || '--'}</td>
                    </tr>`;
                });
                
                html += '</table>';
                document.getElementById("results").innerHTML = html;
            })
            .catch(error => {
                console.error("Error searching for blood group:", error);
                document.getElementById("results").innerHTML = '<p class="no-results">Error searching for blood group: ' + error.message + '</p>';
            });
    }

    function displaySearchResults(filteredData) {
        let html = '';
        if (filteredData.length > 0) {
            html = `<table class="results-table">
                <tr>
                    <th>Profile</th>
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
                    <td><img src="profiles/${student.id}.png" alt="Profile" class="search-result-profile-pic" onerror="this.src='df.png'"></td>
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
        } else if (searchInput.value.trim()) {
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
        
        
        searchTimeout = setTimeout(performSearch, 3000);
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
        
        const defaultProfilePath = 'df.png';
        
        const img = new Image();
        img.onload = function() {
            console.log("Default profile image loaded successfully!");
        };
        img.onerror = function() {
            console.warn("Default profile image not found at " + defaultProfilePath + "! Using fallback.");
            
            
            const fallbackImageUri = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIyMCIgZmlsbD0iIzAwZmY5ZCIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMTAwIiByPSI0MCIgZmlsbD0iIzAwZmY5ZCIvPjwvc3ZnPg==';
            
            
            const profileImages = document.querySelectorAll('img[src="' + defaultProfilePath + '"]');
            profileImages.forEach(img => {
                img.src = fallbackImageUri;
            });
        };
        img.src = defaultProfilePath;
    }
    
   
    window.addEventListener('DOMContentLoaded', function() {
        setTimeout(checkProfileImageExists, 1000); 
    });

    
    loadPaymentData().then(() => {
        console.log('NUBTK System initialized');
        checkProfileImageExists();
    });
});



document.addEventListener('DOMContentLoaded', function() {
    
    function checkAdLoaded(adContainerId, fallbackId) {
        setTimeout(function() {
            const adContainer = document.getElementById(adContainerId);
            const fallbackBanner = document.getElementById(fallbackId);
            
            if (adContainer && fallbackBanner) {
                
                const adIframe = adContainer.querySelector('iframe');
                
                if (adIframe && adIframe.clientHeight > 0) {
                    
                    fallbackBanner.style.display = 'none';
                } else {
                    
                    adContainer.style.display = 'none';
                    fallbackBanner.style.display = 'block';
                }
            }
        }, 3000); 
    }
    
   
    checkAdLoaded('mainBannerAd', 'fallbackBanner');
    
    
    document.getElementById('profileBtn').addEventListener('click', function() {
        setTimeout(function() {
            checkAdLoaded('profileBannerAd1', 'fallbackProfileBanner1');
           
        }, 500);
    });
});

function checkStudentProfileImages() {
    if (!paymentData || !paymentData.length) return;
    
    console.log("Checking profile images for students...");
    
    
    const profileStatus = {
        found: [],
        missing: []
    };
    
    paymentData.forEach(student => {
        const studentId = student.id;
        const img = new Image();
        
        img.onload = function() {
            profileStatus.found.push(studentId);
            console.log(`Profile image found for student ${studentId}`);
        };
        
        img.onerror = function() {
            profileStatus.missing.push(studentId);
            console.log(`No profile image found for student ${studentId}`);
        };
        
        img.src = `profiles/${studentId}.png`;
    });
    
    
    setTimeout(() => {
        console.log("Profile image status summary:");
        console.log(`Found: ${profileStatus.found.length} images`);
        console.log(`Missing: ${profileStatus.missing.length} images`);
    }, 5000);
}


document.addEventListener('DOMContentLoaded', function() {
    setupDynamicBackground();
});

function setupDynamicBackground() {
    
    let bgContainer = document.getElementById('backgroundContainer');
    if (!bgContainer) {
        bgContainer = document.createElement('div');
        bgContainer.id = 'backgroundContainer';
        document.body.insertBefore(bgContainer, document.body.firstChild);
    }
    
    
    const bgImage = document.createElement('img');
    bgImage.className = 'dynamic-bg';
    bgContainer.appendChild(bgImage);
    
    
    setRandomBackground(bgImage);
    
    
    const lastVisit = localStorage.getItem('lastVisit');
    const today = new Date().toDateString();
    
    
    if (lastVisit !== today) {
        localStorage.setItem('lastVisit', today);
        localStorage.removeItem('lastBackgroundIndex'); 
    }
}

function setRandomBackground(imgElement) {
    
    const backgrounds = [
        'background/1.png',
        'background/2.png',
        'background/3.png',
        'background/4.png'
    ];
    
   
    let lastIndex = parseInt(localStorage.getItem('lastBackgroundIndex'));
    if (isNaN(lastIndex)) {
        lastIndex = -1;
    }
    
    
    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * backgrounds.length);
    } while (backgrounds.length > 1 && newIndex === lastIndex);
    
    
    localStorage.setItem('lastBackgroundIndex', newIndex);
    
    
    const preloader = new Image();
    preloader.onload = function() {
        
        imgElement.src = backgrounds[newIndex];
        imgElement.style.opacity = '1';
    };
    preloader.src = backgrounds[newIndex];
}

